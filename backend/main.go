package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/config"
	"github.com/gulam/interviewprep/backend/internal/db"
	"github.com/gulam/interviewprep/backend/internal/middleware"
	"github.com/gulam/interviewprep/backend/internal/partners"
	"github.com/gulam/interviewprep/backend/internal/questions"
	"github.com/gulam/interviewprep/backend/internal/search"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}
	defer pool.Close()

	authH := auth.NewHandler(pool)
	questionH := questions.NewHandler(pool)
	searchH := search.NewHandler(pool)
	partnerH := partners.NewHandler(pool)

	mux := http.NewServeMux()

	// --- auth ---
	mux.HandleFunc("POST /api/auth/signup", authH.Signup)
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/auth/logout", authH.Logout)
	mux.HandleFunc("GET /api/auth/me", auth.RequireAuth(pool, authH.Me))
	mux.HandleFunc("PUT /api/account/profile", auth.RequireAuth(pool, authH.UpdateProfile))
	mux.HandleFunc("DELETE /api/account", auth.RequireAuth(pool, authH.DeleteAccount))

	// --- questions ---
	mux.HandleFunc("GET /api/meta", auth.OptionalAuth(pool, questionH.Meta))
	mux.HandleFunc("GET /api/questions", auth.OptionalAuth(pool, questionH.List))
	mux.HandleFunc("POST /api/questions", auth.RequireAuth(pool, questionH.Create))
	mux.HandleFunc("GET /api/questions/{id}", auth.OptionalAuth(pool, questionH.Get))
	mux.HandleFunc("PUT /api/questions/{id}", auth.RequireAuth(pool, questionH.Update))
	mux.HandleFunc("POST /api/questions/{id}/rate", auth.RequireAuth(pool, questionH.Rate))
	mux.HandleFunc("DELETE /api/questions/{id}", auth.RequireAuth(pool, questionH.Delete))
	mux.HandleFunc("POST /api/questions/{id}/comments", auth.RequireAuth(pool, questionH.CreateComment))
	mux.HandleFunc("POST /api/comments/{id}/replies", auth.RequireAuth(pool, questionH.CreateReply))
	mux.HandleFunc("POST /api/questions/{id}/encounter", auth.RequireAuth(pool, questionH.RecordEncounter))
	mux.HandleFunc("POST /api/questions/{id}/save", auth.RequireAuth(pool, questionH.Save))
	mux.HandleFunc("DELETE /api/questions/{id}/save", auth.RequireAuth(pool, questionH.Unsave))
	mux.HandleFunc("GET /api/saved", auth.RequireAuth(pool, questionH.Saved))

	// --- search ---
	mux.HandleFunc("GET /api/search", auth.OptionalAuth(pool, searchH.Search))

	// --- find partner ---
	mux.HandleFunc("GET /api/partners", auth.OptionalAuth(pool, partnerH.List))
	mux.HandleFunc("POST /api/partners", auth.RequireAuth(pool, partnerH.Create))
	mux.HandleFunc("GET /api/partners/mine", auth.RequireAuth(pool, partnerH.Mine))
	mux.HandleFunc("GET /api/partners/{id}", auth.OptionalAuth(pool, partnerH.Get))
	mux.HandleFunc("POST /api/partners/{id}/interested", auth.RequireAuth(pool, partnerH.Interested))
	mux.HandleFunc("POST /api/partners/{id}/approve", auth.RequireAuth(pool, partnerH.Approve))
	mux.HandleFunc("POST /api/partners/{id}/unapprove", auth.RequireAuth(pool, partnerH.Unapprove))
	mux.HandleFunc("DELETE /api/partners/{id}", auth.RequireAuth(pool, partnerH.Delete))

	handler := middleware.Logging(middleware.CORS(cfg.AllowedOrigin, mux))

	addr := ":" + cfg.Port
	log.Printf("backend listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}
