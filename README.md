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

## Deploy (production)

### 1. Supabase (database)

1. Create a project at https://supabase.com -> New project.
2. Open **SQL Editor** and run `supabase/migrations/001_init.sql`, then `002_ratings.sql`.
3. Settings -> Database -> Connection string. Copy the **pooler** URI (port 6543) into
   the backend's `DATABASE_URL`.
4. (Optional) Seed the question bank from your machine:
   ```bash
   cd backend
   go run ./cmd/seed -csv "/path/to/Sorting Interview Questions - Sheet1.csv" -db "postgres://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres"
   ```

### 2. Backend on Render

1. Push this repo to GitHub (already done: `hellofullvibe/residencyvibe`).
2. Render -> New -> **Blueprint** -> pick the repo. It reads `render.yaml`.
3. After the service is created, go to Environment and set:
   - `DATABASE_URL` = your Supabase pooler URI
   - `ALLOWED_ORIGIN` = your Vercel frontend URL (e.g. `https://residencyvibe.vercel.app`)
4. Deploy. Note the service URL (e.g. `https://residencyvibe-backend.onrender.com`).

### 3. Frontend on Vercel

1. https://vercel.com -> Add New Project -> import the repo.
2. Root directory: `frontend`.
3. Framework preset: Next.js (auto-detected).
4. Environment variables:
   - `BACKEND_URL` = your Render service URL (e.g. `https://residencyvibe-backend.onrender.com`)
5. Deploy. The app proxies `/api/*` to Render server-side, so session cookies stay
   same-origin on the Vercel domain.

### 4. Custom domain (www.residencyvibe.space)

1. Vercel project -> Settings -> Domains -> add `www.residencyvibe.space`.
2. Follow Vercel's DNS instructions at your registrar (CNAME `www` -> `cname.vercel-dns.com`).
3. Update the backend's `ALLOWED_ORIGIN` to `https://www.residencyvibe.space` and redeploy.

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