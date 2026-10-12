-- Migration 045: harden company referrer RLS and inbox abuse controls.
-- Additive on 044. HLD: docs/COMPANY_REFERRER_HLD.md.

-- Length caps
alter table public.company_referrers
  drop constraint if exists company_referrers_display_name_len,
  drop constraint if exists company_referrers_company_len,
  drop constraint if exists company_referrers_title_len,
  drop constraint if exists company_referrers_bio_len,
  drop constraint if exists company_referrers_linkedin_len;

alter table public.company_referrers
  add constraint company_referrers_display_name_len check (char_length(display_name) <= 80),
  add constraint company_referrers_company_len check (char_length(company) <= 80),
  add constraint company_referrers_title_len check (char_length(title) <= 80),
  add constraint company_referrers_bio_len check (bio is null or char_length(bio) <= 400),
  add constraint company_referrers_linkedin_len check (linkedin is null or char_length(linkedin) <= 500);

alter table public.company_referral_requests
  drop constraint if exists company_referral_requests_name_len,
  drop constraint if exists company_referral_requests_email_len,
  drop constraint if exists company_referral_requests_role_len,
  drop constraint if exists company_referral_requests_notes_len,
  drop constraint if exists company_referral_requests_linkedin_len;

alter table public.company_referral_requests
  add constraint company_referral_requests_name_len check (char_length(candidate_name) <= 80),
  add constraint company_referral_requests_email_len check (char_length(candidate_email) <= 120),
  add constraint company_referral_requests_role_len check (char_length(role) <= 120),
  add constraint company_referral_requests_notes_len check (notes is null or char_length(notes) <= 2000),
  add constraint company_referral_requests_linkedin_len check (candidate_linkedin is null or char_length(candidate_linkedin) <= 500);

-- One open ask per email per referrer
create unique index if not exists company_referral_requests_open_email_idx
  on public.company_referral_requests (referrer_id, lower(candidate_email))
  where source = 'request'
    and status in ('requested', 'reviewing')
    and candidate_email <> '';

-- Hide user_id from anonymous readers (owner still has full SELECT as authenticated)
revoke select on public.company_referrers from anon;
grant select (
  id, display_name, company, company_slug, title, linkedin, slug, bio, open_to_refer, created_at, updated_at
) on public.company_referrers to anon;

-- Insert: cannot spoof another user's candidate_user_id
drop policy if exists "anyone can request an open referrer" on public.company_referral_requests;
create policy "anyone can request an open referrer"
  on public.company_referral_requests
  for insert
  with check (
    (candidate_user_id is null or candidate_user_id = auth.uid())
    and exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id
        and (r.open_to_refer = true or r.user_id = auth.uid())
    )
  );

drop policy if exists "referrer can delete requests" on public.company_referral_requests;
create policy "referrer can delete requests"
  on public.company_referral_requests
  for delete
  using (
    exists (
      select 1 from public.company_referrers r
      where r.id = referrer_id and r.user_id = auth.uid()
    )
  );

grant delete on public.company_referral_requests to authenticated;

-- Status-only updates (RLS USING cannot compare OLD/NEW)
create or replace function public.company_referral_requests_status_only()
returns trigger
language plpgsql
as $$
begin
  if new.referrer_id is distinct from old.referrer_id
    or new.candidate_user_id is distinct from old.candidate_user_id
    or new.candidate_name is distinct from old.candidate_name
    or new.candidate_email is distinct from old.candidate_email
    or new.candidate_linkedin is distinct from old.candidate_linkedin
    or new.role is distinct from old.role
    or new.notes is distinct from old.notes
    or new.source is distinct from old.source
  then
    raise exception 'Only status can be updated on referral requests';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists company_referral_requests_status_only on public.company_referral_requests;
create trigger company_referral_requests_status_only
  before update on public.company_referral_requests
  for each row execute function public.company_referral_requests_status_only();

-- Inbox cap: SECURITY DEFINER because anon cannot SELECT requests under RLS
create or replace function public.company_referral_requests_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_count integer;
begin
  if new.source = 'request' then
    select count(*) into open_count
    from public.company_referral_requests
    where referrer_id = new.referrer_id
      and source = 'request'
      and status in ('requested', 'reviewing');
    if open_count >= 40 then
      raise exception 'referrer inbox is full';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists company_referral_requests_insert_guard on public.company_referral_requests;
create trigger company_referral_requests_insert_guard
  before insert on public.company_referral_requests
  for each row execute function public.company_referral_requests_insert_guard();
