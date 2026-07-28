-- 040: client_events — minimal product-event sink for the edit-at-score funnel
-- (M2 of the reverse-merge design doc). Client-direct inserts via the anon key;
-- owner-scoped RLS; append-only (no UPDATE/DELETE policies on purpose).
-- Events (M2): report_view, edit_click (props.prewall=true when stashed from a
-- signed-out click), version_save, delta_view, edit_bounce, link_failed,
-- version_write_failed.

create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.client_events enable row level security;

create policy "users insert own client events"
  on public.client_events for insert
  with check (auth.uid() = user_id);

create policy "users read own client events"
  on public.client_events for select
  using (auth.uid() = user_id);

-- Funnel queries group by event over time windows.
create index if not exists client_events_user_event_idx
  on public.client_events (user_id, event, created_at desc);
