-- Candidate asks via /refer share links must include a LinkedIn or resume URL.
-- Referrer-logged "submitted" rows may still omit it (they already know the person).

alter table public.company_referral_requests
  drop constraint if exists company_referral_requests_request_needs_linkedin;

alter table public.company_referral_requests
  add constraint company_referral_requests_request_needs_linkedin
  check (
    source <> 'request'
    or (
      candidate_linkedin is not null
      and length(btrim(candidate_linkedin)) > 0
    )
  );

-- Clearer failure on insert than a bare check violation.
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
    if new.candidate_linkedin is null or length(btrim(new.candidate_linkedin)) = 0 then
      raise exception 'linkedin or resume url required';
    end if;

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
