package questions

import (
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// settingsOrder is the canonical display order for institutional settings.
var settingsOrder = []string{
	"Community Based",
	"University Based",
	"Military Based",
	"Community Based University Affiliated",
	"Other",
}

// settingColumn maps a setting name to its weight column on the questions table.
func settingColumn(setting string) string {
	switch setting {
	case "Community Based":
		return "q.setting_community_based"
	case "University Based":
		return "q.setting_university_based"
	case "Military Based":
		return "q.setting_military_based"
	case "Community Based University Affiliated":
		return "q.setting_cb_university_affiliated"
	case "Other":
		return "q.setting_other"
	}
	return ""
}

type SettingShare struct {
	Setting    string  `json:"setting"`
	Percentage float64 `json:"percentage"`
	Count      int     `json:"count"`
}

type Question struct {
	ID                   uuid.UUID  `json:"id"`
	Text                 string     `json:"text"`
	Variants             []string   `json:"variants"`
	Category             string     `json:"category"`
	Specialty            *string    `json:"specialty"`
	Program              *string    `json:"program"`
	InstitutionalSetting *string    `json:"institutional_setting"`
	Frequency            *string    `json:"frequency"`
	Year                 *int       `json:"year"`
	Star                 float64    `json:"star"`
	Programs             []string   `json:"programs"`
	CreatedBy            *uuid.UUID `json:"created_by"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`

	CommentCount   int `json:"comment_count"`
	EncounterCount int `json:"encounter_count"`

	// Settings distribution (computed from base weights + encounters).
	Settings []SettingShare `json:"settings"`

	// internal: base weights + encounter-derived setting counts.
	SettingCommunityBased  int            `json:"-"`
	SettingUniversityBased int            `json:"-"`
	SettingMilitaryBased   int            `json:"-"`
	SettingCBUA            int            `json:"-"`
	SettingOther           int            `json:"-"`
	EncounterSettings      map[string]int `json:"-"`

	MyRating    *int       `json:"my_rating,omitempty"`
	MyEncounter *Encounter `json:"my_encounter,omitempty"`
	Saved       bool       `json:"saved"`
}

type Encounter struct {
	Encountered bool   `json:"encountered"`
	ProgramName string `json:"program_name,omitempty"`
}

// computeSettings merges base weights with encounter-derived counts and returns
// the percentage distribution across all settings (including zeros).
func ComputeSettings(base, enc map[string]int) []SettingShare {
	if base == nil {
		base = map[string]int{}
	}
	if enc == nil {
		enc = map[string]int{}
	}
	counts := map[string]int{}
	total := 0
	for _, s := range settingsOrder {
		c := base[s] + enc[s]
		counts[s] = c
		total += c
	}
	out := make([]SettingShare, 0, len(settingsOrder))
	for _, s := range settingsOrder {
		pct := 0.0
		if total > 0 {
			pct = math.Round(float64(counts[s])/float64(total)*1000) / 10
		}
		out = append(out, SettingShare{Setting: s, Percentage: pct, Count: counts[s]})
	}
	return out
}

type Comment struct {
	ID             uuid.UUID  `json:"id"`
	QuestionID     uuid.UUID  `json:"question_id"`
	UserID         uuid.UUID  `json:"user_id"`
	AuthorUsername string     `json:"author_username"`
	Content        string     `json:"content"`
	CreatedAt      time.Time  `json:"created_at"`
	Replies        []*Comment `json:"replies"`
}
