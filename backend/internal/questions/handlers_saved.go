package questions

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
)

// RecordEncounter records ALL programs where the user encountered the question
// (search + checkbox multi-select). It replaces the user's previous program set.
// Backward compatible with a single {program_id} or {program_name}.
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
		Encountered  bool        `json:"encountered"`
		ProgramIDs   []uuid.UUID `json:"program_ids"`
		ProgramNames []string    `json:"program_names"`
		ProgramID    *uuid.UUID  `json:"program_id"`
		ProgramName  string      `json:"program_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Normalize into a list of program ids. Legacy single forms map to one element.
	ids := in.ProgramIDs
	if len(ids) == 0 && in.ProgramID != nil {
		ids = []uuid.UUID{*in.ProgramID}
	}
	// Resolve program names to ids (skip ones not in the mapping).
	for _, name := range in.ProgramNames {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if p, err := h.resolveProgramByName(r, name); err == nil && p.ID != uuid.Nil {
			ids = append(ids, p.ID)
		}
	}
	if len(ids) == 0 && strings.TrimSpace(in.ProgramName) != "" {
		if p, err := h.resolveProgramByName(r, strings.TrimSpace(in.ProgramName)); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not resolve program")
			return
		} else if p.ID != uuid.Nil {
			ids = []uuid.UUID{p.ID}
		}
	}

	// Deduplicate ids.
	seen := map[uuid.UUID]bool{}
	uniq := []uuid.UUID{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			uniq = append(uniq, id)
		}
	}
	ids = uniq

	// Replace the user's program set for this question.
	if _, err := h.pool.Exec(r.Context(),
		`delete from encounters where question_id = $1 and user_id = $2`, questionID, u.ID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not update encounter")
		return
	}

	names := []string{}
	for _, pid := range ids {
		name, err := h.programName(r, pid)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "program not found: "+pid.String())
			return
		}
		if _, err := h.pool.Exec(r.Context(), `
			insert into encounters (question_id, user_id, encountered, program_name, program_id)
			values ($1, $2, true, $3, $4)`,
			questionID, u.ID, name, pid); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not record encounter")
			return
		}
		names = append(names, name)
	}

	// Add the programs to the question's aggregate list (deduped) and stamp year.
	if len(names) > 0 {
		if _, err := h.pool.Exec(r.Context(), `
			update questions
			set programs = (select array_agg(distinct x) from unnest(programs || $2::text[]) x),
			    year = extract(year from now())::int,
			    updated_at = now()
			where id = $1`, questionID, names); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update program list")
			return
		}
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"encountered": len(names) > 0,
		"programs":    names,
	})
}

// resolveProgramByName finds a program by exact name (used for legacy input).
func (h *Handler) resolveProgramByName(r *http.Request, name string) (ProgramRef, error) {
	var p ProgramRef
	err := h.pool.QueryRow(r.Context(),
		`select id, name from programs where lower(name) = lower($1) limit 1`, name).Scan(&p.ID, &p.Name)
	return p, err
}

type ProgramRef struct {
	ID   uuid.UUID
	Name string
}

func (h *Handler) programName(r *http.Request, id uuid.UUID) (string, error) {
	var name string
	err := h.pool.QueryRow(r.Context(),
		`select name from programs where id = $1`, id).Scan(&name)
	return name, err
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
		select `+SelectCols+`
		from saved_questions sv
		join questions q on q.id = sv.question_id
		cross join lateral (
		  select coalesce(round(avg(r.star)::numeric, 1), 0) as star
		  from ratings r where r.question_id = q.id
		) s
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
			&item.SettingCommunityBased, &item.SettingUniversityBased, &item.SettingMilitaryBased,
			&item.SettingCBUA, &item.SettingOther, &item.EncounterSettings,
			&item.CommentCount, &item.EncounterCount,
		); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not scan questions")
			return
		}
		item.Settings = ComputeSettings(Weights(item), item.EncounterSettings)
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
