-- Soft delete: questions are hidden, never physically removed.
alter table public.questions add column if not exists is_deleted boolean not null default false;
create index if not exists questions_not_deleted_idx on public.questions (is_deleted) where is_deleted = false;