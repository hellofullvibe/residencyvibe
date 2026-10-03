package search

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/questions"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// Search finds questions and comments matching a query.
// q : text query
// type : "questions" | "comments" | "all" (default all)
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		respond.JSON(w, http.StatusOK, map[string]any{
			"questions": []questions.Question{},
			"comments":  []map[string]any{},
		})
		return
	}

	limit := 50
	query := strings.Join(strings.Fields(q), " & ") // AND semantics

	// --- questions ---
	questionsRows, err := h.pool.Query(r.Context(), `
		select `+questions.SelectCols+`
		from questions q
		cross join lateral (
		  select coalesce(round(avg(r.star)::numeric, 1), 0) as star
		  from ratings r where r.question_id = q.id
		) s
		where q.is_deleted = false
		   and (to_tsvector('english', q.text) @@ to_tsquery('english', $1)
		   or q.text ilike '%' || $2 || '%'
		   or exists (select 1 from unnest(q.variants) v where v ilike '%' || $2 || '%'))
		order by q.created_at desc
		limit $3`, query, q, limit)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "search failed")
		return
	}
	questionResults := []questions.Question{}
	for questionsRows.Next() {
		var item questions.Question
		if err := questionsRows.Scan(
			&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
			&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
			&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
			&item.SettingCommunityBased, &item.SettingUniversityBased, &item.SettingMilitaryBased,
			&item.SettingCBUA, &item.SettingOther, &item.EncounterSettings,
			&item.CommentCount, &item.EncounterCount,
		); err == nil {
			item.Settings = questions.ComputeSettings(questions.Weights(item), item.EncounterSettings)
			questionResults = append(questionResults, item)
		}
	}
	questionsRows.Close()

	// --- comments ---
	commentRows, err := h.pool.Query(r.Context(), `
		select c.id, c.question_id, q.text as question_text, u.username, c.content, c.created_at
		from comments c
		join questions q on q.id = c.question_id
		join users u on u.id = c.user_id
		where to_tsvector('english', c.content) @@ to_tsquery('english', $1)
		   or c.content ilike '%' || $2 || '%'
		order by c.created_at desc
		limit $3`, query, q, limit)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "search failed")
		return
	}
	defer commentRows.Close()

	type commentHit struct {
		ID           uuid.UUID `json:"id"`
		QuestionID   uuid.UUID `json:"question_id"`
		QuestionText string    `json:"question_text"`
		Author       string    `json:"author_username"`
		Content      string    `json:"content"`
		CreatedAt    time.Time `json:"created_at"`
	}
	commentResults := []commentHit{}
	for commentRows.Next() {
		var c commentHit
		if err := commentRows.Scan(&c.ID, &c.QuestionID, &c.QuestionText, &c.Author,
			&c.Content, &c.CreatedAt); err == nil {
			commentResults = append(commentResults, c)
		}
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"questions": questionResults,
		"comments":  commentResults,
	})
}
