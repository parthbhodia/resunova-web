-- Migration 044: employees who can refer candidates at their company.
--
-- An employee publishes "I work at X and can refer candidates." Candidates
-- open /refer/?s=<slug> and send a request. This is not a friend-invite
-- rewards loop and not the outreach tracker in 021_referral_contacts.
--
-- Work email is intentionally not stored: a public SELECT policy would leak it.
-- Applied on production Resume Builder (eiumlptnsmowvkxucprl). HLD: docs/COMPANY_REFERRER_HLD.md.

create table if not exists public.company_referrers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  display_name  text not null default '',
  company       text not null default '',
  company_slug  text not null default '',
  title         text not null default '',
  linkedin      text,
  slug          text not null unique,
  bio           text,
  open_to_refer boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists company_referrers_company_slug_idx
  on public.company_referrers (company_slug)
  where open_to_refer = true;

alter table public.company_referrers enable row level security;

drop policy if exists "users manage own company referrer profile" on public.company_referrers;
create policy "users manage own company referrer profile"
  on public.company_referrers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "open company referrers are publicly readable" on public.company_referrers;
create policy "open company referrers are publicly readable"
  on public.company_referrers
  for select using (open_to_refer = true);

grant select on public.company_referrers to authenticated;
grant select (
  id, display_name, company, company_slug, title, linkedin, slug, bio, open_to_refer, created_at, updated_at
) on public.company_referrers to anon;
grant insert, update, delete on public.company_referrers to authenticated;

create table if not exists public.company_referral_requests (
  id                 uuid primary key default gen_random_uuid(),
  referrer_id        uuid not null references public.company_referrers (id) on delete cascade,
  candidate_user_id  uuid references auth.users (id) on delete set null,
  candidate_name     text not null default '',
  candidate_email    text not null default '',
  candidate_linkedin text,
  role               text not null default '',
  notes              text,
  source             text not null default 'request'
                     check (source in ('request', 'submitted')),
  status             text not null default 'requested'
                     check (status in ('requested', 'reviewing', 'referred', 'declined')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists company_referral_requests_referrer_idx
  on public.company_referral_requests (referrer_id, created_at desc);

alter table public.company_referral_requests enable row level security;

drop policy if exists "anyone can request an open referrer" on public.company_referral_requests;
create policy "anyone can request an open referrer"
  on public.company_referral_requests
  for insert
  with check (
    exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id
        and (r.open_to_refer = true or r.user_id = auth.uid())
    )
  );

drop policy if exists "referrer or candidate can read requests" on public.company_referral_requests;
create policy "referrer or candidate can read requests"
  on public.company_referral_requests
  for select
  using (
    auth.uid() = candidate_user_id
    or exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "referrer can update request status" on public.company_referral_requests;
create policy "referrer can update request status"
  on public.company_referral_requests
  for update
  using (
    exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id and r.user_id = auth.uid()
    )
  );

grant insert on public.company_referral_requests to anon, authenticated;
grant select, update on public.company_referral_requests to authenticated;
