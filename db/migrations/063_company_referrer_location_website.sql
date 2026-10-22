-- Company location + website on referrer desks.
--
-- Candidates browsing /refer need to know where the company hires from and
-- which site to check. Both are entered by the employee who publishes the desk.
-- Columns stay nullable so existing rows keep working; the web upsert requires
-- both on every save going forward.

alter table public.company_referrers
  add column if not exists company_location text,
  add column if not exists company_website text;

-- Anon reads of open desks (migration 062) must include the new public columns.
grant select (
  id, display_name, company, company_slug, title, linkedin, slug, bio,
  company_location, company_website,
  open_to_refer, created_at, updated_at, referred_count
) on public.company_referrers to anon;
