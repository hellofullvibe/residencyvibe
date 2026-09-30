package questions

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
)

// loadComments loads top-level comments with their replies for a question.
func (h *Handler) loadComments(r *http.Request, questionID uuid.UUID) ([]*Comment, error) {
	rows, err := h.pool.Query(r.Context(), `
		select c.id, c.question_id, c.user_id, u.username, c.content, c.created_at,
		       c.parent_id
		from comments c
		join users u on u.id = c.user_id
		where c.question_id = $1
		order by c.created_at asc`, questionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type row struct {
		Comment
		ParentID *uuid.UUID
	}
	all := []row{}
	for rows.Next() {
		var rc row
		if err := rows.Scan(&rc.ID, &rc.QuestionID, &rc.UserID, &rc.AuthorUsername,
			&rc.Content, &rc.CreatedAt, &rc.ParentID); err != nil {
			return nil, err
		}
		all = append(all, rc)
	}

	byID := map[uuid.UUID]*Comment{}
	top := []*Comment{}
	for _, rc := range all {
		c := rc.Comment
		c.Replies = []*Comment{}
		ptr := &c
		byID[rc.ID] = ptr
		if rc.ParentID == nil {
			top = append(top, ptr)
		}
	}
	for _, rc := range all {
		if rc.ParentID != nil {
			if parent, ok := byID[*rc.ParentID]; ok {
				parent.Replies = append(parent.Replies, byID[rc.ID])
			}
		}
	}
	return top, nil
}

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
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
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Content = strings.TrimSpace(in.Content)
	if in.Content == "" {
		respond.Error(w, http.StatusBadRequest, "comment is required")
		return
	}
	if len(in.Content) > MaxCommentsLen {
		respond.Error(w, http.StatusBadRequest, "comment exceeds 3000 characters")
		return
	}
	// ensure question exists
	var exists bool
	if err := h.pool.QueryRow(r.Context(),
		`select exists(select 1 from questions where id = $1)`, questionID).Scan(&exists); err != nil || !exists {
		respond.Error(w, http.StatusNotFound, "question not found")
		return
	}

	var c Comment
	err = h.pool.QueryRow(r.Context(), `
		insert into comments (question_id, user_id, content)
		values ($1, $2, $3)
		returning id, question_id, user_id, $4::text, content, created_at`,
		questionID, u.ID, in.Content, u.Username,
	).Scan(&c.ID, &c.QuestionID, &c.UserID, &c.AuthorUsername, &c.Content, &c.CreatedAt)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create comment")
		return
	}
	c.Replies = []*Comment{}
	respond.JSON(w, http.StatusCreated, c)
}

func (h *Handler) CreateReply(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	commentID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid comment id")
		return
	}
	var in struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Content = strings.TrimSpace(in.Content)
	if in.Content == "" {
		respond.Error(w, http.StatusBadRequest, "reply is required")
		return
	}
	if len(in.Content) > MaxRepliesLen {
		respond.Error(w, http.StatusBadRequest, "reply exceeds 3000 characters")
		return
	}
	var questionID uuid.UUID
	err = h.pool.QueryRow(r.Context(),
		`select question_id from comments where id = $1`, commentID).Scan(&questionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "comment not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "could not load comment")
		return
	}

	var c Comment
	err = h.pool.QueryRow(r.Context(), `
		insert into comments (question_id, user_id, parent_id, content)
		values ($1, $2, $3, $4)
		returning id, question_id, user_id, $5::text, content, created_at`,
		questionID, u.ID, commentID, in.Content, u.Username,
	).Scan(&c.ID, &c.QuestionID, &c.UserID, &c.AuthorUsername, &c.Content, &c.CreatedAt)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create reply")
		return
	}
	c.Replies = []*Comment{}
	respond.JSON(w, http.StatusCreated, c)
}
