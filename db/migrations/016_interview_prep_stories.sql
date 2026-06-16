-- Migration 016: Interview Prep stories and question schema extensions
-- Run in Supabase SQL Editor → New query

create table if not exists public.interview_prep_stories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  session_id        uuid references public.interview_prep_sessions (id) on delete cascade,
  title             text not null,
  theme             text,
  source_experience text,
  situation         text not null,
  task              text not null,
  action            text not null,
  result            text not null,
  reflection        text not null,
  created_at        timestamptz not null default now()
);

create index if not exists interview_prep_stories_user_idx 
  on public.interview_prep_stories (user_id);

alter table public.interview_prep_stories enable row level security;

drop policy if exists "users manage own prep stories" on public.interview_prep_stories;
create policy "users manage own prep stories" on public.interview_prep_stories
  for all using (auth.uid() = user_id);

-- Add JSONB columns for star_framework and best_story to interview_prep_questions
alter table public.interview_prep_questions
  add column if not exists star_framework jsonb,
  add column if not exists best_story jsonb;
