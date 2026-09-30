-- Ratings: per-user star ratings for questions (star is the average of ratings).
-- Run this if you already applied 001_init.sql; otherwise it's included in 001.

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

alter table public.ratings enable row level security;