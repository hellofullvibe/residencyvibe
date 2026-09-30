package questions

import (
	"net/http"

	"github.com/gulam/interviewprep/backend/internal/respond"
)

var defaultCategories = []string{
	"About You", "About Program", "Hobbies", "Situation", "Medical",
	"Social", "Experience", "Ask Them",
}

var defaultSpecialties = []string{
	"Internal Medicine", "Family Medicine", "Pediatrics", "General Surgery",
	"Anesthesiology", "Emergency Medicine", "Psychiatry", "OB/GYN", "Other",
}

var defaultInstitutionalSettings = []string{
	"Community Based",
	"University Based",
	"Community Based University Affiliated",
	"Military Based",
}

var defaultFrequencies = []string{"Most", "Sometimes", "Rare"}

// Meta returns the filter options. Programs are gathered from the program column
// and the aggregate programs arrays (seed data + encounter additions).
func (h *Handler) Meta(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		select distinct program from questions where program is not null and program <> ''
		union
		select distinct unnest(programs) from questions
		where array_length(programs, 1) > 0
	`)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load meta")
		return
	}
	defer rows.Close()

	extra := []string{}
	seen := map[string]bool{}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			continue
		}
		if !seen[v] {
			seen[v] = true
			extra = append(extra, v)
		}
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"categories":             defaultCategories,
		"specialties":            defaultSpecialties,
		"programs":               extra,
		"institutional_settings": defaultInstitutionalSettings,
		"frequencies":            defaultFrequencies,
	})
}
