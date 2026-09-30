package questions

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
)

const (
	MaxCommentsLen = 3000
	MaxRepliesLen  = 3000
)

// starExpr is the SQL for a question's average star rating.
// Referenced as s.star in queries that cross join lateral starExpr.
const starExpr = `
		coalesce(round(avg(r.star)::numeric, 1), 0) as star
	`

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	conds := []string{"1=1"}
	args := []any{}
	arg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}

	if v := q.Get("category"); v != "" {
		conds = append(conds, "q.category = "+arg(v))
	}
	if v := q.Get("specialty"); v != "" {
		conds = append(conds, "q.specialty = "+arg(v))
	}
	if v := q.Get("program"); v != "" {
		conds = append(conds, "q.program = "+arg(v))
	}
	if v := q.Get("institutional_setting"); v != "" {
		conds = append(conds, "q.institutional_setting = "+arg(v))
	}
	if v := q.Get("frequency"); v != "" {
		conds = append(conds, "q.frequency = "+arg(v))
	}
	if v := q.Get("min_star"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			conds = append(conds, "s.star >= "+arg(n))
		}
	}

	order := "q.created_at desc"
	switch q.Get("sort") {
	case "star":
		order = "s.star desc, q.created_at desc"
	case "frequency":
		order = "case q.frequency when 'Most' then 3 when 'Sometimes' then 2 when 'Rare' then 1 else 0 end desc, q.created_at desc"
	case "oldest":
		order = "q.created_at asc"
	default:
		order = "q.created_at desc"
	}

	limit := 50
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	offset := 0
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	where := strings.Join(conds, " and ")
	sql := `
		select q.id, q.text, q.variants, q.category, q.specialty, q.program,
		       q.institutional_setting, q.frequency, q.year, s.star, q.programs,
		       q.created_by, q.created_at, q.updated_at,
		       (select count(*) from comments c where c.question_id = q.id and c.parent_id is null) as comment_count,
		       (select count(*) from encounters e where e.question_id = q.id and e.encountered) as encounter_count
		from questions q
		cross join lateral (
		  select ` + starExpr + `
		  from ratings r where r.question_id = q.id
		) s
		where ` + where + `
		order by ` + order + `
		limit ` + arg(limit) + ` offset ` + arg(offset)

	rows, err := h.pool.Query(r.Context(), sql, args...)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not list questions")
		return
	}
	defer rows.Close()

	items := []Question{}
	for rows.Next() {
		var item Question
		if err := rows.Scan(
			&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
			&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
			&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
			&item.CommentCount, &item.EncounterCount,
		); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not scan questions")
			return
		}
		items = append(items, item)
	}

	// Attach per-user fields when authenticated.
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, items)
	}

	respond.JSON(w, http.StatusOK, items)
}

// attachUserState fills my_rating, my_encounter and saved for the current user.
func (h *Handler) attachUserState(r *http.Request, userID uuid.UUID, items []Question) {
	for i := range items {
		var myRating int
		err := h.pool.QueryRow(r.Context(), `
			select star from ratings where question_id = $1 and user_id = $2`,
			items[i].ID, userID,
		).Scan(&myRating)
		if err == nil {
			items[i].MyRating = &myRating
		}

		var enc Encounter
		err = h.pool.QueryRow(r.Context(), `
			select encountered, coalesce(program_name, '')
			from encounters where question_id = $1 and user_id = $2`,
			items[i].ID, userID,
		).Scan(&enc.Encountered, &enc.ProgramName)
		if err == nil {
			items[i].MyEncounter = &enc
		}
		err = h.pool.QueryRow(r.Context(), `
			select exists(select 1 from saved_questions where question_id = $1 and user_id = $2)`,
			items[i].ID, userID,
		).Scan(&items[i].Saved)
		if err != nil {
			items[i].Saved = false
		}
	}
}

type questionInput struct {
	Text                 string   `json:"text"`
	Variants             []string `json:"variants"`
	Category             string   `json:"category"`
	Specialty            *string  `json:"specialty"`
	Program              *string  `json:"program"`
	InstitutionalSetting *string  `json:"institutional_setting"`
	Frequency            *string  `json:"frequency"`
	Year                 *int     `json:"year"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var in questionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Text = strings.TrimSpace(in.Text)
	if in.Text == "" {
		respond.Error(w, http.StatusBadRequest, "question text is required")
		return
	}
	if in.Category == "" {
		in.Category = "About You"
	}
	if in.Variants == nil {
		in.Variants = []string{}
	}

	var item Question
	err := h.pool.QueryRow(r.Context(), `
		insert into questions (text, variants, category, specialty, program, institutional_setting, frequency, year, created_by)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id, text, variants, category, specialty, program, institutional_setting, frequency, year, programs, created_by, created_at, updated_at`,
		in.Text, in.Variants, in.Category, in.Specialty, in.Program, in.InstitutionalSetting,
		in.Frequency, in.Year, u.ID,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create question")
		return
	}
	item.Star = 0
	respond.JSON(w, http.StatusCreated, item)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}

	var item Question
	err = h.pool.QueryRow(r.Context(), `
		select q.id, q.text, q.variants, q.category, q.specialty, q.program,
		       q.institutional_setting, q.frequency, q.year, s.star, q.programs,
		       q.created_by, q.created_at, q.updated_at,
		       (select count(*) from comments c where c.question_id = q.id and c.parent_id is null) as comment_count,
		       (select count(*) from encounters e where e.question_id = q.id and e.encountered) as encounter_count
		from questions q
		cross join lateral (
		  select `+starExpr+`
		  from ratings r where r.question_id = q.id
		) s
		where q.id = $1`, id,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		&item.CommentCount, &item.EncounterCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "question not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "could not load question")
		return
	}

	list := []Question{item}
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, list)
		item = list[0]
	}

	comments, err := h.loadComments(r, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load comments")
		return
	}

	encounters, err := h.encounterSummary(r, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load encounters")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"question":   item,
		"comments":   comments,
		"encounters": encounters,
	})
}

// encounterSummary aggregates "I encountered" reports by program name.
func (h *Handler) encounterSummary(r *http.Request, questionID uuid.UUID) ([]EncounterSummary, error) {
	rows, err := h.pool.Query(r.Context(), `
		select coalesce(nullif(program_name, ''), 'unspecified') as p, count(*) as n
		from encounters
		where question_id = $1 and encountered
		group by p
		order by n desc, p asc`, questionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []EncounterSummary{}
	for rows.Next() {
		var e EncounterSummary
		if err := rows.Scan(&e.ProgramName, &e.Count); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}

type EncounterSummary struct {
	ProgramName string `json:"program_name"`
	Count       int    `json:"count"`
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in questionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var item Question
	err = h.pool.QueryRow(r.Context(), `
		update questions set
		  text = coalesce(nullif($1, ''), text),
		  variants = $2,
		  category = coalesce(nullif($3, ''), category),
		  specialty = $4, program = $5, institutional_setting = $6,
		  frequency = $7, year = $8,
		  updated_at = now()
		where id = $9
		returning id, text, variants, category, specialty, program, institutional_setting, frequency, year, programs, created_by, created_at, updated_at`,
		in.Text, in.Variants, in.Category, in.Specialty, in.Program, in.InstitutionalSetting,
		in.Frequency, in.Year, id,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "question not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "could not update question")
		return
	}
	list := []Question{item}
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, list)
		item = list[0]
	} else {
		item.Star = 0
	}
	respond.JSON(w, http.StatusOK, item)
}

// Rate upserts the current user's star rating and returns the new average.
func (h *Handler) Rate(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in struct {
		Star int `json:"star"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if in.Star < 1 || in.Star > 5 {
		respond.Error(w, http.StatusBadRequest, "star must be between 1 and 5")
		return
	}

	_, err = h.pool.Exec(r.Context(), `
		insert into ratings (question_id, user_id, star)
		values ($1, $2, $3)
		on conflict (question_id, user_id)
		do update set star = excluded.star, updated_at = now()`,
		id, u.ID, in.Star)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not save rating")
		return
	}

	var avg float64
	if err := h.pool.QueryRow(r.Context(), `
		select coalesce(round(avg(star)::numeric, 1), 0) from ratings where question_id = $1`,
		id,
	).Scan(&avg); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load rating")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"star":      avg,
		"my_rating": in.Star,
	})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	tag, err := h.pool.Exec(r.Context(),
		`delete from questions where id = $1 and created_by = $2`, id, u.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete question")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "question not found or not yours")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
