-- Migration 017: Detach interview_prep_stories from session lifecycle
-- Run in Supabase SQL Editor → New query
--
-- The story bank is a durable, user-level master set that accumulates across
-- prep sessions. With ON DELETE CASCADE (migration 016), deleting a single prep
-- session would silently wipe master stories created during it. Switch the FK
-- to ON DELETE SET NULL so stories survive session deletion (they remain owned
-- by the user via user_id, which keeps its CASCADE to auth.users).

alter table public.interview_prep_stories
  drop constraint if exists interview_prep_stories_session_id_fkey;

alter table public.interview_prep_stories
  add constraint interview_prep_stories_session_id_fkey
  foreign key (session_id) references public.interview_prep_sessions (id)
  on delete set null;
