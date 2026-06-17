-- Migration 019: Shared interview question bank (real, sourced questions)
-- Run in Supabase SQL Editor → New query
--
-- A global, NON-personalized bank of real reported interview questions (LeetCode
-- company tags), keyed by (company_slug, role_family, question_type). Served to
-- all users (incl. anon) by the backend with no LLM cost. Distinct from the
-- per-user interview_prep_questions / interview_prep_stories tables.
-- See docs/INTERVIEW_QUESTION_BANK_DESIGN.md. Seed via import_question_bank.py.

create table if not exists public.interview_question_bank (
  id             uuid primary key default gen_random_uuid(),
  company_slug   text,                                   -- normalized alnum key (null = role-family-generic)
  role_family    text not null default 'software-engineer',
  question_type  text not null,                          -- 'coding'|'system_design'|'technical'|'company'|'behavioral_generic'
  question_text  text not null,
  source         text not null,                          -- 'leetcode'|'glassdoor'|'<repo>'|'llm_inferred'|'community'
  source_url     text,
  is_inferred    boolean not null default false,         -- TRUE = AI-guessed (label it); FALSE = real reported
  difficulty     text,                                   -- 'easy'|'medium'|'hard'
  tags           text[] not null default '{}'::text[],
  times_reported int,
  created_at     timestamptz not null default now(),
  last_sourced_at timestamptz
);

create index if not exists iqb_lookup_idx
  on public.interview_question_bank (company_slug, role_family, question_type);

create unique index if not exists iqb_dedupe_idx
  on public.interview_question_bank (company_slug, role_family, question_type, md5(lower(question_text)));

-- Shared reference data: enable RLS with NO policies, so only the service-role
-- backend can read/write; web clients reach it via /api/generate-interview-questions.
alter table public.interview_question_bank enable row level security;
