package questions

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
)

// RecordEncounter upserts "I encountered (yes/no) at program X" and adds the
// program name to the question's aggregate program list.
func (h *Handler) RecordEncounter(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	questionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in struct {
		Encountered bool   `json:"encountered"`
		ProgramName string `json:"program_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.ProgramName = strings.TrimSpace(in.ProgramName)

	_, err = h.pool.Exec(r.Context(), `
		insert into encounters (question_id, user_id, encountered, program_name)
		values ($1, $2, $3, $4)
		on conflict (question_id, user_id)
		do update set encountered = excluded.encountered, program_name = excluded.program_name`,
		questionID, u.ID, in.Encountered, nullIfEmpty(in.ProgramName))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not record encounter")
		return
	}

	// Add the program to the question's aggregate list (once), and stamp the current year.
	if in.Encountered && in.ProgramName != "" {
		if _, err := h.pool.Exec(r.Context(), `
			update questions
			set programs = case when $2 = any(programs) then programs else programs || $2::text end,
			    year = extract(year from now())::int,
			    updated_at = now()
			where id = $1`, questionID, in.ProgramName); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update program list")
			return
		}
	} else if in.Encountered {
		// Encountered but no program name — still stamp the year.
		if _, err := h.pool.Exec(r.Context(), `
			update questions set year = extract(year from now())::int, updated_at = now()
			where id = $1`, questionID); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update year")
			return
		}
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"encountered":  in.Encountered,
		"program_name": in.ProgramName,
	})
}

// Save adds a question to the user's saved list.
func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	h.setSaved(w, r, true)
}

// Unsave removes a question from the user's saved list.
func (h *Handler) Unsave(w http.ResponseWriter, r *http.Request) {
	h.setSaved(w, r, false)
}

func (h *Handler) setSaved(w http.ResponseWriter, r *http.Request, save bool) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	questionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	if save {
		_, err = h.pool.Exec(r.Context(), `
			insert into saved_questions (user_id, question_id)
			values ($1, $2)
			on conflict (user_id, question_id) do nothing`, u.ID, questionID)
	} else {
		_, err = h.pool.Exec(r.Context(),
			`delete from saved_questions where user_id = $1 and question_id = $2`, u.ID, questionID)
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not update saved questions")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]bool{"saved": save})
}

// Saved lists the current user's saved questions.
func (h *Handler) Saved(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	rows, err := h.pool.Query(r.Context(), `
		select q.id, q.text, q.variants, q.category, q.specialty, q.program,
		       q.institutional_setting, q.frequency, q.year, rt.star, q.programs,
		       q.created_by, q.created_at, q.updated_at,
		       (select count(*) from comments c where c.question_id = q.id and c.parent_id is null) as comment_count,
		       (select count(*) from encounters e where e.question_id = q.id and e.encountered) as encounter_count
		from saved_questions sv
		join questions q on q.id = sv.question_id
		cross join lateral (
		  select coalesce(round(avg(r.star)::numeric, 1), 0) as star
		  from ratings r where r.question_id = q.id
		) rt
		where sv.user_id = $1
		order by sv.created_at desc`, u.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load saved questions")
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
		item.Saved = true
		items = append(items, item)
	}
	respond.JSON(w, http.StatusOK, items)
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
