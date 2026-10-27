-- 0014_feedback_email.sql
--
-- Optional contact email on visitor feedback (Oct 27, 2026), so the
-- site owner can reply to a feature request or a problem report.
-- Nullable: existing rows and anonymous submissions stay as-is.
-- Idempotent (safe to re-run).

alter table public.feedback add column if not exists email text;
