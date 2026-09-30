-- Residency Interview Prep - initial schema
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------- users ----------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null unique,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- sessions ----------
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_token_idx on public.sessions (token);
create index if not exists sessions_user_idx on public.sessions (user_id);

-- ---------- questions ----------
-- category:          About You, About Program, Hobbies, Situation, Medical, Social, Experience, Ask Them
-- specialty:         Internal Medicine, Family Medicine, ...
-- program:           SUNY Downstate, Jacobi, Jamaica, ... (optional specific program)
-- institutional_setting: Community Based, University Based, Community Based University Affiliated, Military Based
-- frequency:         Most, Sometimes, Rare
-- star:              1-5 (aggregate rating)
-- programs:          aggregate list of programs where candidates reported encountering this question (from seed data)
create table if not exists public.questions (
  id                   uuid primary key default gen_random_uuid(),
  text                 text not null,
  variants             text[] not null default '{}',
  category             text not null,
  specialty            text,
  program              text,
  institutional_setting text,
  frequency            text,
  year                 int,
  star                 int not null default 0,
  programs             text[] not null default '{}',
  created_by           uuid references public.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists questions_category_idx on public.questions (category);
create index if not exists questions_specialty_idx on public.questions (specialty);
create index if not exists questions_program_idx on public.questions (program);
create index if not exists questions_star_idx on public.questions (star);
create index if not exists questions_frequency_idx on public.questions (frequency);

-- full text search on questions (variants are searched via ILIKE in the query;
-- array_to_string is STABLE so it cannot be used in an index expression)
create index if not exists questions_fts_idx on public.questions
  using gin (to_tsvector('english', text));

-- ---------- comments & replies (parent_id = reply chain) ----------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_question_idx on public.comments (question_id);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comments_fts_idx on public.comments
  using gin (to_tsvector('english', content));

-- ---------- encounters (I encountered yes/no + program) ----------
create table if not exists public.encounters (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  encountered  boolean not null default false,
  program_name text,
  created_at   timestamptz not null default now(),
  unique (question_id, user_id)
);

-- ---------- saved questions ----------
create table if not exists public.saved_questions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists saved_user_idx on public.saved_questions (user_id);

-- ---------- ratings (star = average of user ratings) ----------
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  star        int not null check (star between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists ratings_question_idx on public.ratings (question_id);

-- ---------- RLS (defense in depth; the Go backend uses the service role) ----------
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.questions enable row level security;
alter table public.comments enable row level security;
alter table public.encounters enable row level security;
alter table public.saved_questions enable row level security;
alter table public.ratings enable row level security;

create policy "public read" on public.questions for select using (true);
create policy "public read" on public.comments for select using (true);