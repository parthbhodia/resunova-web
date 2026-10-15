-- Richer candidate packet on referral asks: phone, years of experience, headline.
-- Snapshot at ask time (not a live read of their private profile).

alter table public.company_referral_requests
  add column if not exists candidate_phone text,
  add column if not exists candidate_years_experience smallint,
  add column if not exists candidate_headline text;

alter table public.company_referral_requests
  drop constraint if exists company_referral_requests_phone_len,
  drop constraint if exists company_referral_requests_years_range,
  drop constraint if exists company_referral_requests_headline_len;

alter table public.company_referral_requests
  add constraint company_referral_requests_phone_len
    check (candidate_phone is null or char_length(candidate_phone) <= 40),
  add constraint company_referral_requests_years_range
    check (
      candidate_years_experience is null
      or (candidate_years_experience >= 0 and candidate_years_experience <= 50)
    ),
  add constraint company_referral_requests_headline_len
    check (candidate_headline is null or char_length(candidate_headline) <= 160);

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
    or new.resume_pdf_path is distinct from old.resume_pdf_path
    or new.candidate_phone is distinct from old.candidate_phone
    or new.candidate_years_experience is distinct from old.candidate_years_experience
    or new.candidate_headline is distinct from old.candidate_headline
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
