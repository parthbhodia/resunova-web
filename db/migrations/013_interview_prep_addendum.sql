-- Migration 013: Interview Prep addendum
-- Run in Supabase SQL Editor → New query
-- Adds missing columns + performance index to the tables created in 012.

-- ── interview_prep_sessions additions ────────────────────────────────────────
-- Total question count requested by the user during setup.
alter table public.interview_prep_sessions
  add column if not exists question_count int not null default 20;

-- Fast lookup: most recent session per user (used by GET /api/interview-prep/latest).
create index if not exists interview_prep_sessions_user_updated_idx
  on public.interview_prep_sessions (user_id, updated_at desc);

-- ── interview_prep_questions additions ───────────────────────────────────────
-- LLM-generated rationale for why this question was selected.
alter table public.interview_prep_questions
  add column if not exists reason text;

-- Ordering index so questions return in stable insertion order.
create index if not exists interview_prep_questions_session_created_idx
  on public.interview_prep_questions (session_id, created_at asc);
