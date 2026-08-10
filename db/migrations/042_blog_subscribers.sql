-- Migration 042: blog email subscribers (double opt-in).
--
-- RLS is enabled with NO policies and NO client-facing function. Unlike
-- 037_blog_engagement, which exposes SECURITY DEFINER RPCs to `anon`, this
-- table has no door open to the browser at all: every write goes through
-- `POST /api/blog/subscribe` in resunova-api using the service-role key.
--
-- ⚠️ THAT IS THE WHOLE DESIGN, NOT AN ACCIDENT. `confirm_token` decides whether
-- an address is confirmed, so it must never reach the browser. A client-direct
-- RPC would have to either return the token (letting whoever typed the address
-- confirm it without ever receiving the mail, which defeats double opt-in
-- entirely) or send the mail from the browser (impossible — the Resend key
-- lives on the server). Adding a client-callable subscribe function to this
-- table reintroduces exactly that hole.
--
-- Anti-abuse: a public endpoint that sends mail is an email-bombing vector.
-- `confirmation_sent_at` is the throttle — the API refuses to re-send inside a
-- cooldown window, so hammering the endpoint with a victim's address cannot
-- flood their inbox. Confirmed and unsubscribed addresses are never mailed a
-- confirmation again at all.
--
-- Run in Supabase SQL Editor -> New query (this repo's migrations are applied
-- manually against the live "Resume Builder" project, eiumlptnsmowvkxucprl;
-- see db/migrations/037_blog_engagement.sql for the same convention).

create table if not exists public.blog_subscribers (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null unique,
  -- Which surface the address came from: a post slug, or 'index' for the blog
  -- index. Attribution is the whole reason to collect it — "which post earns
  -- subscribers" is the only question that changes what we publish next.
  source                text,
  -- Set when a signed-in reader subscribes. Nullable because the entire point
  -- is capturing readers who are NOT signed in yet.
  user_id               uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),

  -- Double opt-in. An address is mailable only when confirmed_at is set and
  -- unsubscribed_at is not.
  confirm_token         uuid not null default gen_random_uuid(),
  confirmed_at          timestamptz,
  confirmation_sent_at  timestamptz,

  -- Every send must carry a working opt-out, and the token has to be stable so
  -- a link in an old email keeps working.
  unsubscribe_token     uuid not null default gen_random_uuid(),
  unsubscribed_at       timestamptz
);

create unique index if not exists blog_subscribers_confirm_token_idx
  on public.blog_subscribers (confirm_token);
create unique index if not exists blog_subscribers_unsubscribe_token_idx
  on public.blog_subscribers (unsubscribe_token);
create index if not exists blog_subscribers_source_idx
  on public.blog_subscribers (source);

-- The mailable list. Partial rather than a filter at send time: "who do we
-- send to" should have exactly one definition, and a WHERE clause someone
-- forgets is how an unsubscribed address gets mailed.
create index if not exists blog_subscribers_mailable_idx
  on public.blog_subscribers (confirmed_at)
  where confirmed_at is not null and unsubscribed_at is null;

alter table public.blog_subscribers enable row level security;

-- No policies, and no grants to anon/authenticated. The service-role key used
-- by resunova-api bypasses RLS; every other caller is denied every row.
revoke all on table public.blog_subscribers from anon, authenticated;
