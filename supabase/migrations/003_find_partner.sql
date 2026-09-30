-- Find Partner: profile fields + partner session requests + interests.
-- Run this after 001_init.sql.

-- ---------- profile fields ----------
alter table public.users add column if not exists gender text;
alter table public.users add column if not exists timezone text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists specialty text;

-- ---------- partner session requests (Find Partner wall) ----------
-- The creator's profile details are fetched at request time; contact info is
-- revealed only to participants who express interest (or are approved).
create table if not exists public.partner_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  session_date     date not null,
  session_time     time not null,
  timezone         text not null,
  max_participants int not null check (max_participants between 2 and 4),
  specialty        text,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists partner_requests_user_idx on public.partner_requests (user_id);
create index if not exists partner_requests_date_idx on public.partner_requests (session_date);

-- ---------- interests (interested -> approved) ----------
create table if not exists public.partner_interests (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.partner_requests(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  status     text not null default 'interested' check (status in ('interested', 'approved')),
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists partner_interests_request_idx on public.partner_interests (request_id);
create index if not exists partner_interests_user_idx on public.partner_interests (user_id);

alter table public.partner_requests enable row level security;
alter table public.partner_interests enable row level security;

create policy "public read" on public.partner_requests for select using (true);
create policy "public read" on public.partner_interests for select using (true);