package auth

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var in struct {
		FullName        string `json:"full_name"`
		Email           string `json:"email"`
		Username        string `json:"username"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	in.Username = strings.TrimSpace(in.Username)

	if in.FullName == "" || in.Email == "" || in.Username == "" || in.Password == "" {
		respond.Error(w, http.StatusBadRequest, "all fields are required")
		return
	}
	if len(in.Password) < 6 {
		respond.Error(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}
	if in.Password != in.ConfirmPassword {
		respond.Error(w, http.StatusBadRequest, "passwords do not match")
		return
	}

	hash, err := HashPassword(in.Password)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	var user User
	err = h.pool.QueryRow(r.Context(), `
		insert into users (full_name, email, username, password_hash)
		values ($1, $2, $3, $4)
		returning id, full_name, email, username, gender, timezone, phone, specialty, created_at`,
		in.FullName, in.Email, in.Username, hash,
	).Scan(&user.ID, &user.FullName, &user.Email, &user.Username, &user.Gender, &user.Timezone, &user.Phone, &user.Specialty, &user.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			msg := "email or username already exists"
			if strings.Contains(pgErr.ConstraintName, "email") {
				msg = ErrEmailTaken.Error()
			}
			if strings.Contains(pgErr.ConstraintName, "username") {
				msg = ErrUsernameTaken.Error()
			}
			respond.Error(w, http.StatusConflict, msg)
			return
		}
		log.Printf("signup error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not create account")
		return
	}

	s, err := CreateSession(r.Context(), h.pool, user.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}
	SetSessionCookie(w, s.Token)
	respond.JSON(w, http.StatusCreated, user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))

	var (
		userID uuid.UUID
		hash   string
	)
	err := h.pool.QueryRow(r.Context(),
		`select id, password_hash from users where email = $1`, in.Email,
	).Scan(&userID, &hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusUnauthorized, ErrInvalidLogin.Error())
			return
		}
		respond.Error(w, http.StatusInternalServerError, "could not sign in")
		return
	}
	if !CheckPassword(hash, in.Password) {
		respond.Error(w, http.StatusUnauthorized, ErrInvalidLogin.Error())
		return
	}

	s, err := CreateSession(r.Context(), h.pool, userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}
	SetSessionCookie(w, s.Token)
	respond.JSON(w, http.StatusOK, map[string]string{"message": "signed in"})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token := SessionToken(r)
	if token != "" {
		_ = DestroySession(r.Context(), h.pool, token)
	}
	ClearSessionCookie(w)
	respond.JSON(w, http.StatusOK, map[string]string{"message": "signed out"})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	u := UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	respond.JSON(w, http.StatusOK, u)
}

// UpdateProfile updates the optional profile fields used by Find Partner.
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var in struct {
		Gender    *string `json:"gender"`
		Timezone  *string `json:"timezone"`
		Phone     *string `json:"phone"`
		Specialty *string `json:"specialty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.loadUser(r.Context(), u.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load account")
		return
	}

	// Apply only provided fields.
	updateGender := in.Gender != nil && strings.TrimSpace(*in.Gender) != ""
	updateTimezone := in.Timezone != nil && strings.TrimSpace(*in.Timezone) != ""
	updatePhone := in.Phone != nil && strings.TrimSpace(*in.Phone) != ""
	updateSpecialty := in.Specialty != nil && strings.TrimSpace(*in.Specialty) != ""

	var gender, timezone, phone, specialty any
	if updateGender {
		gender = strings.TrimSpace(*in.Gender)
	}
	if updateTimezone {
		timezone = strings.TrimSpace(*in.Timezone)
	}
	if updatePhone {
		phone = strings.TrimSpace(*in.Phone)
	}
	if updateSpecialty {
		specialty = strings.TrimSpace(*in.Specialty)
	}

	// NULL-safe update: preserve existing values when a field is not provided.
	err = h.pool.QueryRow(r.Context(), `
		update users set
		  gender = coalesce($1, gender),
		  timezone = coalesce($2, timezone),
		  phone = coalesce($3, phone),
		  specialty = coalesce($4, specialty)
		where id = $5
		returning id, full_name, email, username, gender, timezone, phone, specialty, created_at`,
		gender, timezone, phone, specialty, u.ID,
	).Scan(&updated.ID, &updated.FullName, &updated.Email, &updated.Username, &updated.Gender, &updated.Timezone, &updated.Phone, &updated.Specialty, &updated.CreatedAt)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not update profile")
		return
	}

	respond.JSON(w, http.StatusOK, updated)
}

// loadUser returns a user by ID.
func (h *Handler) loadUser(ctx context.Context, id uuid.UUID) (User, error) {
	var u User
	err := h.pool.QueryRow(ctx, `
		select id, full_name, email, username, gender, timezone, phone, specialty, created_at
		from users where id = $1`, id,
	).Scan(&u.ID, &u.FullName, &u.Email, &u.Username, &u.Gender, &u.Timezone, &u.Phone, &u.Specialty, &u.CreatedAt)
	return u, err
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	u := UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	token := SessionToken(r)
	if token != "" {
		_ = DestroySession(r.Context(), h.pool, token)
	}
	// Cascade deletes sessions, comments, encounters, saved questions.
	if _, err := h.pool.Exec(r.Context(), `delete from users where id = $1`, u.ID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete account")
		return
	}
	ClearSessionCookie(w)
	respond.JSON(w, http.StatusOK, map[string]string{"message": "account deleted"})
}
