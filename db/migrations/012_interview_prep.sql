-- Migration 012: Interview Prep sessions and questions
-- Run in Supabase SQL Editor → New query

create table if not exists public.interview_prep_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  resume_id       uuid references public.resumes (id) on delete set null,
  company         text,
  role            text not null,
  job_description text,
  category        text not null, -- Technology, Legal, Healthcare, etc.
  difficulty      text not null check (difficulty in ('easy', 'medium', 'hard')),
  interview_type  text not null,
  sources         text[] not null default '{}'::text[],
  focus_areas     text[] not null default '{}'::text[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists interview_prep_sessions_user_idx 
  on public.interview_prep_sessions (user_id, created_at desc);

alter table public.interview_prep_sessions enable row level security;

drop policy if exists "users manage own prep sessions" on public.interview_prep_sessions;
create policy "users manage own prep sessions" on public.interview_prep_sessions
  for all using (auth.uid() = user_id);

-- ── interview_prep_questions ──────────────────────────────────────────────────
create table if not exists public.interview_prep_questions (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.interview_prep_sessions (id) on delete cascade,
  section_id       text not null, -- 'resume', 'jd', 'behavioral', 'company'
  question_text    text not null,
  suggested_answer text,          -- Talking points / structural cues
  user_response    text,          -- Saved answer drafts
  feedback         jsonb,         -- LLM analysis/rating of response
  created_at       timestamptz not null default now()
);

create index if not exists interview_prep_questions_session_idx 
  on public.interview_prep_questions (session_id);

alter table public.interview_prep_questions enable row level security;

drop policy if exists "users manage own prep questions" on public.interview_prep_questions;
create policy "users manage own prep questions" on public.interview_prep_questions
  for all using (
    exists (
      select 1 
      from public.interview_prep_sessions 
      where id = session_id and user_id = auth.uid()
    )
  );
