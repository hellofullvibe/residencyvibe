package programs

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

type Program struct {
	ID                   uuid.UUID `json:"id"`
	Name                 string    `json:"name"`
	InstitutionalSetting string    `json:"institutional_setting"`
}

var validSettings = map[string]bool{
	"Community Based":                       true,
	"University Based":                      true,
	"Military Based":                        true,
	"Community Based University Affiliated": true,
	"Other":                                 true,
}

// Search lists programs whose name matches the query (used in the encounter
// search-and-select). With no query it returns a sample for the type-ahead.
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	sql := `select id, name, institutional_setting from programs`
	args := []any{}
	if q != "" {
		sql += ` where lower(name) ilike '%' || lower($1) || '%' order by name asc limit 25`
		args = append(args, q)
	} else {
		sql += ` order by name asc limit 25`
	}

	rows, err := h.pool.Query(r.Context(), sql, args...)
	if err != nil {
		log.Printf("program search error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not search programs")
		return
	}
	defer rows.Close()

	items := []Program{}
	for rows.Next() {
		var p Program
		if err := rows.Scan(&p.ID, &p.Name, &p.InstitutionalSetting); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not load programs")
			return
		}
		items = append(items, p)
	}
	respond.JSON(w, http.StatusOK, items)
}

// Create lets users add a program that is not in the mapping yet.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var in struct {
		Name                 string `json:"name"`
		InstitutionalSetting string `json:"institutional_setting"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.InstitutionalSetting = strings.TrimSpace(in.InstitutionalSetting)
	if in.Name == "" {
		respond.Error(w, http.StatusBadRequest, "program name is required")
		return
	}
	if !validSettings[in.InstitutionalSetting] {
		respond.Error(w, http.StatusBadRequest, "invalid institutional setting")
		return
	}

	var p Program
	err := h.pool.QueryRow(r.Context(), `
		insert into programs (name, institutional_setting)
		values ($1, $2)
		on conflict (name) do update set institutional_setting = excluded.institutional_setting
		returning id, name, institutional_setting`,
		in.Name, in.InstitutionalSetting,
	).Scan(&p.ID, &p.Name, &p.InstitutionalSetting)
	if err != nil {
		log.Printf("create program error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not add program")
		return
	}
	respond.JSON(w, http.StatusCreated, p)
}
