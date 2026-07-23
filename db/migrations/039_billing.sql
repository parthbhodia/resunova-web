-- 039_billing.sql — Stripe consumer billing (schema of record; ALREADY APPLIED
-- to the prod "Resume Builder" Supabase project eiumlptnsmowvkxucprl).
--
-- Two tables, both SERVICE-ONLY:
--   * billing_subscriptions — one row per user = the current subscription
--     state, written exclusively by the resunova-api Stripe webhook handler
--     (service-role client). Clients read their plan via GET /api/billing/status,
--     never by querying this table.
--   * stripe_webhook_events — the webhook idempotency ledger, keyed on the
--     Stripe event id so replayed deliveries are dropped by PK conflict.
--
-- "Service-only RLS" = RLS enabled with ZERO policies: anon/authenticated can
-- touch nothing; only the service-role backend (which bypasses RLS) can.
-- Same pattern as 037_blog_engagement's tables.
--
-- Deployment runbook: resunova-api docs/STRIPE_BILLING_LAUNCH.md.

create table if not exists public.billing_subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id      text not null unique,
  stripe_subscription_id  text unique,
  -- Our plan vocabulary; must stay in sync with resunova-api
  -- services/stripe_billing.py PRICE_KEYS.
  price_key               text check (price_key is null or price_key in ('pro_monthly', 'pro_quarterly')),
  stripe_price_id         text,
  -- Stripe subscription statuses verbatim.
  status                  text check (status is null or status in
                            ('incomplete', 'incomplete_expired', 'trialing', 'active',
                             'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  canceled_at             timestamptz,
  trial_end               timestamptz,
  past_due_since          timestamptz,
  -- Out-of-order webhook guard: a delivery older than this is skipped.
  latest_event_created_at timestamptz,
  latest_event_id         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status);

alter table public.billing_subscriptions enable row level security;
-- Deliberately NO policies: service-role only.

create table if not exists public.stripe_webhook_events (
  stripe_event_id   text primary key,
  event_type        text not null,
  object_id         text,
  event_created_at  timestamptz not null,
  api_version       text,
  livemode          boolean not null default false,
  processing_state  text not null default 'received'
                      check (processing_state in ('received', 'processing', 'processed', 'ignored', 'failed')),
  attempt_count     integer not null default 1 check (attempt_count > 0),
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  last_error        text,
  payload           jsonb not null,
  payload_sha256    text not null check (payload_sha256 ~ '^[0-9a-f]{64}$')
);

create index if not exists stripe_webhook_events_state_received_idx
  on public.stripe_webhook_events (processing_state, received_at);

alter table public.stripe_webhook_events enable row level security;
-- Deliberately NO policies: service-role only.

-- NOTE: no updated_at trigger — the api backend stamps updated_at explicitly
-- on every write (verified: prod tables carry no triggers).
