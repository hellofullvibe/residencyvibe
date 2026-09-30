package partners

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

type Request struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	CreatorName     string    `json:"creator_name"`
	Gender          *string   `json:"gender,omitempty"`
	SessionDate     string    `json:"session_date"`
	SessionTime     string    `json:"session_time"`
	Timezone        string    `json:"timezone"`
	MaxParticipants int       `json:"max_participants"`
	Specialty       *string   `json:"specialty"`
	Notes           *string   `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
	InterestedCount int       `json:"interested_count"`

	MyInterest string `json:"my_interest,omitempty"`
	IsMine     bool   `json:"is_mine"`

	Interests []Interest `json:"interests,omitempty"`

	// Contact is revealed only when the requester is the creator or has expressed interest.
	CreatorEmail *string `json:"creator_email,omitempty"`
	CreatorPhone *string `json:"creator_phone,omitempty"`
}

type Interest struct {
	ID        uuid.UUID `json:"id"`
	RequestID uuid.UUID `json:"request_id"`
	UserID    uuid.UUID `json:"user_id"`
	Username  string    `json:"username"`
	FullName  string    `json:"full_name"`
	Gender    *string   `json:"gender"`
	Timezone  *string   `json:"timezone"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

const baseSelect = `
	select pr.id, pr.user_id, u.username, u.full_name, u.gender,
	       to_char(pr.session_date, 'YYYY-MM-DD'), to_char(pr.session_time, 'HH24:MI'),
	       pr.timezone, pr.max_participants, pr.specialty, pr.notes, pr.created_at,
	       (select count(*) from partner_interests pi where pi.request_id = pr.id)
	from partner_requests pr
	join users u on u.id = pr.user_id
`

// List returns the Find Partner wall. Contact info is not included.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), baseSelect+` order by pr.session_date asc, pr.session_time asc, pr.created_at desc`)
	if err != nil {
		log.Printf("partner list error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not load partner sessions")
		return
	}
	defer rows.Close()

	items := []Request{}
	for rows.Next() {
		var item Request
		if err := rows.Scan(&item.ID, &item.UserID, &item.CreatorUsername, &item.CreatorName,
			&item.Gender, &item.SessionDate, &item.SessionTime, &item.Timezone, &item.MaxParticipants,
			&item.Specialty, &item.Notes, &item.CreatedAt, &item.InterestedCount); err != nil {
			log.Printf("partner list scan error: %v", err)
			respond.Error(w, http.StatusInternalServerError, "could not load partner sessions")
			return
		}
		items = append(items, item)
	}

	if u := auth.UserFrom(r); u != nil {
		h.attachState(r, u.ID, items)
	}

	respond.JSON(w, http.StatusOK, items)
}

// Create adds a new Find Partner session. The creator must have a complete profile
// (gender, timezone, phone). Profile details are pulled from the account.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	if u.Gender == nil || *u.Gender == "" || u.Timezone == nil || *u.Timezone == "" || u.Phone == nil || *u.Phone == "" {
		respond.Error(w, http.StatusBadRequest, "complete your profile (gender, timezone, phone) before creating a partner session")
		return
	}
	var in struct {
		SessionDate     string  `json:"session_date"`
		SessionTime     string  `json:"session_time"`
		Timezone        string  `json:"timezone"`
		MaxParticipants int     `json:"max_participants"`
		Notes           *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.SessionDate = strings.TrimSpace(in.SessionDate)
	in.SessionTime = strings.TrimSpace(in.SessionTime)
	in.Timezone = strings.TrimSpace(in.Timezone)
	if in.SessionDate == "" || in.SessionTime == "" || in.Timezone == "" {
		respond.Error(w, http.StatusBadRequest, "date, time and timezone are required")
		return
	}
	if in.MaxParticipants < 2 || in.MaxParticipants > 4 {
		respond.Error(w, http.StatusBadRequest, "max participants must be between 2 and 4")
		return
	}

	var item Request
	err := h.pool.QueryRow(r.Context(), `
		insert into partner_requests (user_id, session_date, session_time, timezone, max_participants, specialty, notes)
		values ($1, $2::date, $3::time, $4, $5, $6, $7)
		returning id, $1, $8::text, $9::text, $10::text,
		       to_char(session_date, 'YYYY-MM-DD'), to_char(session_time, 'HH24:MI'),
		       timezone, max_participants, specialty, notes, created_at, 0`,
		u.ID, in.SessionDate, in.SessionTime, in.Timezone, in.MaxParticipants, u.Specialty, in.Notes,
		u.Username, u.FullName, u.Gender,
	).Scan(&item.ID, &item.UserID, &item.CreatorUsername, &item.CreatorName, &item.Gender,
		&item.SessionDate, &item.SessionTime, &item.Timezone, &item.MaxParticipants,
		&item.Specialty, &item.Notes, &item.CreatedAt, &item.InterestedCount)
	if err != nil {
		log.Printf("partner create error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not create partner session")
		return
	}
	item.IsMine = true
	respond.JSON(w, http.StatusCreated, item)
}

// Get returns a single request. Contact info is revealed if the requester is the
// creator or has expressed interest.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid session id")
		return
	}
	var item Request
	err = h.pool.QueryRow(r.Context(), baseSelect+` where pr.id = $1`, id).Scan(
		&item.ID, &item.UserID, &item.CreatorUsername, &item.CreatorName, &item.Gender,
		&item.SessionDate, &item.SessionTime, &item.Timezone, &item.MaxParticipants,
		&item.Specialty, &item.Notes, &item.CreatedAt, &item.InterestedCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "session not found")
			return
		}
		log.Printf("partner get error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not load session")
		return
	}

	u := auth.UserFrom(r)
	if u != nil {
		list := []Request{item}
		h.attachState(r, u.ID, list)
		item = list[0]
		item = h.withContact(r, u.ID, item)
	}

	respond.JSON(w, http.StatusOK, item)
}

// Interested lets a user express interest in a session. From this point the
// user can see the creator's contact info.
func (h *Handler) Interested(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	if u.Gender == nil || *u.Gender == "" || u.Timezone == nil || *u.Timezone == "" || u.Phone == nil || *u.Phone == "" {
		respond.Error(w, http.StatusBadRequest, "complete your profile (gender, timezone, phone) before participating")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid session id")
		return
	}

	// Can't express interest in your own session.
	var owner uuid.UUID
	err = h.pool.QueryRow(r.Context(), `select user_id from partner_requests where id = $1`, id).Scan(&owner)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "session not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "could not load session")
		return
	}
	if owner == u.ID {
		respond.Error(w, http.StatusBadRequest, "you cannot express interest in your own session")
		return
	}

	_, err = h.pool.Exec(r.Context(), `
		insert into partner_interests (request_id, user_id, status)
		values ($1, $2, 'interested')
		on conflict (request_id, user_id)
		do update set status = 'interested'`, id, u.ID)
	if err != nil {
		log.Printf("partner interested error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not submit interest")
		return
	}

	var item Request
	err = h.pool.QueryRow(r.Context(), baseSelect+` where pr.id = $1`, id).Scan(
		&item.ID, &item.UserID, &item.CreatorUsername, &item.CreatorName, &item.Gender,
		&item.SessionDate, &item.SessionTime, &item.Timezone, &item.MaxParticipants,
		&item.Specialty, &item.Notes, &item.CreatedAt, &item.InterestedCount)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load session")
		return
	}
	item = h.withContact(r, u.ID, item)
	item.MyInterest = "interested"
	respond.JSON(w, http.StatusOK, item)
}

// Approve lets the creator approve an interested participant. Approved
// participants can then see the creator's contact info.
func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid session id")
		return
	}
	var in struct {
		UserID uuid.UUID `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tag, err := h.pool.Exec(r.Context(), `
		update partner_interests pi
		set status = 'approved'
		where pi.request_id = $1 and pi.user_id = $2
		  and exists (select 1 from partner_requests pr where pr.id = $1 and pr.user_id = $3)`,
		id, in.UserID, u.ID)
	if err != nil {
		log.Printf("partner approve error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not approve participant")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "interest not found or you are not the creator")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"message": "approved"})
}

// Mine returns the current user's created sessions with their interested users.
func (h *Handler) Mine(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	rows, err := h.pool.Query(r.Context(), baseSelect+` where pr.user_id = $1 order by pr.created_at desc`, u.ID)
	if err != nil {
		log.Printf("partner mine error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not load your sessions")
		return
	}
	defer rows.Close()

	items := []Request{}
	for rows.Next() {
		var item Request
		if err := rows.Scan(&item.ID, &item.UserID, &item.CreatorUsername, &item.CreatorName,
			&item.Gender, &item.SessionDate, &item.SessionTime, &item.Timezone, &item.MaxParticipants,
			&item.Specialty, &item.Notes, &item.CreatedAt, &item.InterestedCount); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not load your sessions")
			return
		}
		item.IsMine = true
		items = append(items, item)
	}

	for i := range items {
		interests, err := h.loadInterests(r, items[i].ID)
		if err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not load participants")
			return
		}
		items[i].Interests = interests
	}

	respond.JSON(w, http.StatusOK, items)
}

// Delete removes a partner session the user created.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid session id")
		return
	}
	tag, err := h.pool.Exec(r.Context(),
		`delete from partner_requests where id = $1 and user_id = $2`, id, u.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete session")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "session not found or not yours")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

// --- helpers ---

func (h *Handler) attachState(r *http.Request, userID uuid.UUID, items []Request) {
	for i := range items {
		items[i].IsMine = items[i].UserID == userID
		var status string
		err := h.pool.QueryRow(r.Context(), `
			select status from partner_interests where request_id = $1 and user_id = $2`,
			items[i].ID, userID).Scan(&status)
		if err == nil {
			items[i].MyInterest = status
		}
	}
}

// withContact reveals the creator's contact info when the requester is the creator
// or has an interest record.
func (h *Handler) withContact(r *http.Request, userID uuid.UUID, item Request) Request {
	if item.UserID == userID {
		me := auth.UserFrom(r)
		item.CreatorEmail = &me.Email
		item.CreatorPhone = me.Phone
		return item
	}
	var exists bool
	err := h.pool.QueryRow(r.Context(), `
		select exists(select 1 from partner_interests where request_id = $1 and user_id = $2)`,
		item.ID, userID).Scan(&exists)
	if err == nil && exists {
		var email, phone *string
		if err := h.pool.QueryRow(r.Context(),
			`select email, phone from users where id = $1`, item.UserID).Scan(&email, &phone); err == nil {
			item.CreatorEmail = email
			item.CreatorPhone = phone
		}
	}
	return item
}

func (h *Handler) loadInterests(r *http.Request, requestID uuid.UUID) ([]Interest, error) {
	rows, err := h.pool.Query(r.Context(), `
		select pi.id, pi.request_id, pi.user_id, u.username, u.full_name, u.gender, u.timezone, pi.status, pi.created_at
		from partner_interests pi
		join users u on u.id = pi.user_id
		where pi.request_id = $1
		order by pi.created_at asc`, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Interest{}
	for rows.Next() {
		var it Interest
		if err := rows.Scan(&it.ID, &it.RequestID, &it.UserID, &it.Username, &it.FullName,
			&it.Gender, &it.Timezone, &it.Status, &it.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, nil
}
