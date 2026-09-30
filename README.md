# Residency Interview Prep

A website for residency interview preparation. Residents share interview questions,
vote with stars/frequency, record where they encountered them, and help each other
with answers via comments and replies.

## Architecture (simple)

```
frontend/   Next.js (App Router) + Tailwind CSS   -> runs on :3000
backend/    Go (net/http) REST API + sessions     -> runs on :8080
supabase/   PostgreSQL schema migrations (SQL)
```

- The Next.js app proxies `/api/*` to the Go backend via `next.config` rewrites, so
  cookies stay same-origin.
- The Go backend talks to the Supabase Postgres database (`DATABASE_URL`).
- Sessions are stored in the `sessions` table with an HttpOnly cookie.
- Stars are per-user ratings (`ratings` table); a question's star = the average.
- Full names are stored internally only and never returned by the API — comments,
  replies, and search show `@username`.

## Setup

### 1. Database (Supabase)

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/migrations/001_init.sql`.
3. Copy the project's Postgres connection string into `backend/.env`:

```
DATABASE_URL=postgres://postgres.[ref]:[password]@aws-0-<region>.pooler.supabase.com:6543/postgres
PORT=8080
ALLOWED_ORIGIN=http://localhost:3000
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL
go mod tidy
go run ./cmd/seed -csv /path/to/Sorting\ Interview\ Questions\ -\ Sheet1.csv   # optional: seed question bank
go run .               # starts API on :8080
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # starts Next.js on :3000
```

## API overview

| Method | Path                     | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| POST   | /api/auth/signup         | Create account (full name, email, username, password) |
| POST   | /api/auth/login          | Sign in                              |
| POST   | /api/auth/logout         | Sign out                             |
| GET    | /api/auth/me             | Current user                         |
| DELETE | /api/account             | Delete account                       |
| GET    | /api/questions           | List questions (filters + pagination) |
| POST   | /api/questions           | Add a question                       |
| GET    | /api/questions/:id       | Question detail with comments        |
| PUT    | /api/questions/:id       | Update question (star, frequency, etc.) |
| DELETE | /api/questions/:id       | Delete own question                  |
| POST   | /api/questions/:id/comments | Comment on a question             |
| POST   | /api/comments/:id/replies | Reply to a comment                  |
| POST   | /api/questions/:id/encounter | Record "I encountered" (adds program to list) |
| POST   | /api/questions/:id/rate     | Rate a question (1-5); star = average of ratings |
| POST   | /api/questions/:id/save     | Save question to account                    |
| DELETE | /api/questions/:id/save  | Unsave question                      |
| GET    | /api/saved               | List saved questions                 |
| GET    | /api/search?q=...        | Search questions and comments        |
| GET    | /api/meta                | Categories, specialties, programs, etc. |

## Milestones

- [x] M1 Account Creation (sign up, sign in, account, account delete, donation)
- [x] M2 Question Bank (categories, specialties, programs, institutional setting, frequency, variants, star, encounters, comments + replies)
- [x] M3 Search (questions + comments)
- [x] M4 Save questions to account