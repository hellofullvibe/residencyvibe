package questions

import (
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

	CommentCount   int        `json:"comment_count"`
	EncounterCount int        `json:"encounter_count"`
	MyRating       *int       `json:"my_rating,omitempty"`
	MyEncounter    *Encounter `json:"my_encounter,omitempty"`
	Saved          bool       `json:"saved"`
}

type Encounter struct {
	Encountered bool   `json:"encountered"`
	ProgramName string `json:"program_name,omitempty"`
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
