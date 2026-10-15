-- Store PDFs for candidate referral asks in a private Supabase Storage bucket.
-- Path format: {candidate_user_id}/{uuid}.pdf. Column holds the object path
-- (not a public URL). Referrers get a signed URL when they open the inbox.

alter table public.company_referral_requests
  add column if not exists resume_pdf_path text;

alter table public.company_referral_requests
  drop constraint if exists company_referral_requests_resume_path_len;

alter table public.company_referral_requests
  add constraint company_referral_requests_resume_path_len
  check (resume_pdf_path is null or char_length(resume_pdf_path) <= 500);

-- source=request needs a LinkedIn/resume URL and/or an uploaded PDF.
alter table public.company_referral_requests
  drop constraint if exists company_referral_requests_request_needs_linkedin;

alter table public.company_referral_requests
  add constraint company_referral_requests_request_needs_resume
  check (
    source <> 'request'
    or (
      (candidate_linkedin is not null and length(btrim(candidate_linkedin)) > 0)
      or (resume_pdf_path is not null and length(btrim(resume_pdf_path)) > 0)
    )
  );

create or replace function public.company_referral_requests_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_count integer;
  has_linkedin boolean;
  has_pdf boolean;
begin
  if new.source = 'request' then
    has_linkedin := new.candidate_linkedin is not null
      and length(btrim(new.candidate_linkedin)) > 0;
    has_pdf := new.resume_pdf_path is not null
      and length(btrim(new.resume_pdf_path)) > 0;
    if not has_linkedin and not has_pdf then
      raise exception 'linkedin or resume required';
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'referral-resumes',
  'referral-resumes',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "referral resumes: candidate upload" on storage.objects;
create policy "referral resumes: candidate upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'referral-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~* '\.pdf$'
  );

drop policy if exists "referral resumes: candidate update own" on storage.objects;
create policy "referral resumes: candidate update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'referral-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'referral-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "referral resumes: candidate delete own" on storage.objects;
create policy "referral resumes: candidate delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'referral-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "referral resumes: candidate or referrer read" on storage.objects;
create policy "referral resumes: candidate or referrer read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'referral-resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.company_referral_requests q
        join public.company_referrers r on r.id = q.referrer_id
        where q.resume_pdf_path = name
          and r.user_id = auth.uid()
      )
    )
  );
