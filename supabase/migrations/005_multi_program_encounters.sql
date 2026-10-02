-- Allow a user to record MULTIPLE programs where they encountered a question.
-- Run this after 004_institutional_settings.sql.
alter table public.encounters drop constraint if exists encounters_question_id_user_id_key;
alter table public.encounters add constraint encounters_question_user_program_key
  unique (question_id, user_id, program_id);