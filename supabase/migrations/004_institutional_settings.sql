-- Institutional settings: program->setting mapping + per-question setting weights.
-- Run this after 003_find_partner.sql.

-- ---------- programs mapping (program name -> institutional setting) ----------
create table if not exists public.programs (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,
  institutional_setting text not null,
  created_at            timestamptz not null default now()
);

create index if not exists programs_name_idx on public.programs (lower(name));

-- ---------- question setting weights (points) ----------
-- Weights are equal data points:
--   Direct = 1 point for the chosen setting.
--   Percentage = the entered numbers as points.
--   Each "I encountered at Program X" adds +1 point to the program's setting.
alter table public.questions add column if not exists setting_community_based int not null default 0;
alter table public.questions add column if not exists setting_university_based int not null default 0;
alter table public.questions add column if not exists setting_military_based int not null default 0;
alter table public.questions add column if not exists setting_cb_university_affiliated int not null default 0;
alter table public.questions add column if not exists setting_other int not null default 0;

-- Backfill legacy single-value institutional_setting as 1 point each.
update public.questions set setting_community_based = 1
  where institutional_setting = 'Community Based' and setting_community_based = 0;
update public.questions set setting_university_based = 1
  where institutional_setting = 'University Based' and setting_university_based = 0;
update public.questions set setting_military_based = 1
  where institutional_setting = 'Military Based' and setting_military_based = 0;
update public.questions set setting_cb_university_affiliated = 1
  where institutional_setting = 'Community Based University Affiliated' and setting_cb_university_affiliated = 0;
update public.questions set setting_other = 1
  where institutional_setting = 'Other' and setting_other = 0;

-- ---------- encounters reference the selected program ----------
alter table public.encounters add column if not exists program_id uuid references public.programs(id);

create index if not exists encounters_program_idx on public.encounters (program_id);

alter table public.programs enable row level security;
create policy "public read" on public.programs for select using (true);
create policy "public insert" on public.programs for insert with check (true);