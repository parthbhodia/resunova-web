-- Interview-prep daily PDF-parse scan-limit counters on user_profiles.
--
-- These two columns are read/written by resume_gui/services/scan_limits.py
-- (_interview_prep_limit_status + record_interview_prep_scan, gated by
-- INTERVIEW_PREP_DAILY_LIMIT). They already exist in the live "Resume Builder"
-- Supabase project (eiumlptnsmowvkxucprl) — they were added ad-hoc alongside the
-- interview-prep scan-limit feature without a committed migration. This file
-- backfills the migration history so a fresh database reproduces the schema.
--
-- Idempotent: safe to run against the live DB (no-op there) and a new one.

alter table user_profiles
  add column if not exists interview_prep_scans_today integer not null default 0;

alter table user_profiles
  add column if not exists interview_prep_scans_reset_at date;
