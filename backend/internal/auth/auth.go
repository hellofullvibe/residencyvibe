package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const cookieName = "ip_session"
const sessionDuration = 30 * 24 * time.Hour

type User struct {
	ID        uuid.UUID `json:"id"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Gender    *string   `json:"gender"`
	Timezone  *string   `json:"timezone"`
	Phone     *string   `json:"phone"`
	Specialty *string   `json:"specialty"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	ErrEmailTaken    = errors.New("email already registered")
	ErrUsernameTaken = errors.New("username already taken")
	ErrInvalidLogin  = errors.New("invalid email or password")
)

func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Token     string
	ExpiresAt time.Time
}

func CreateSession(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (*Session, error) {
	token, err := newToken()
	if err != nil {
		return nil, err
	}
	s := &Session{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(sessionDuration),
	}
	_, err = pool.Exec(ctx, `
		insert into sessions (id, user_id, token, expires_at)
		values ($1, $2, $3, $4)`,
		s.ID, s.UserID, s.Token, s.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func DestroySession(ctx context.Context, pool *pgxpool.Pool, token string) error {
	_, err := pool.Exec(ctx, `delete from sessions where token = $1`, token)
	return err
}

// UserFromToken returns the user for a valid, non-expired session token.
func UserFromToken(ctx context.Context, pool *pgxpool.Pool, token string) (*User, error) {
	var u User
	err := pool.QueryRow(ctx, `
		select u.id, u.full_name, u.email, u.username, u.gender, u.timezone, u.phone, u.specialty, u.created_at
		from sessions s
		join users u on u.id = s.user_id
		where s.token = $1 and s.expires_at > now()`,
		token,
	).Scan(&u.ID, &u.FullName, &u.Email, &u.Username, &u.Gender, &u.Timezone, &u.Phone, &u.Specialty, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// SetSessionCookie writes the session cookie on the response.
func SetSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionDuration.Seconds()),
	})
}

func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
}

func SessionToken(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

// RequireAuth is middleware: it resolves the session cookie and injects the user.
func RequireAuth(pool *pgxpool.Pool, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := SessionToken(r)
		if token == "" {
			respond.Error(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		u, err := UserFromToken(r.Context(), pool, token)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				respond.Error(w, http.StatusUnauthorized, "session expired")
				return
			}
			respond.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyUser{}, u)
		next(w, r.WithContext(ctx))
	}
}

// OptionalAuth is middleware: it injects the user when a valid session cookie
// is present, but does not block unauthenticated requests.
func OptionalAuth(pool *pgxpool.Pool, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := SessionToken(r)
		if token != "" {
			if u, err := UserFromToken(r.Context(), pool, token); err == nil {
				ctx := context.WithValue(r.Context(), ctxKeyUser{}, u)
				next(w, r.WithContext(ctx))
				return
			}
		}
		next(w, r)
	}
}

type ctxKeyUser struct{}

func UserFrom(r *http.Request) *User {
	if u, ok := r.Context().Value(ctxKeyUser{}).(*User); ok {
		return u
	}
	return nil
}
