-- Register Monroe University for institution membership matching.
-- Microsoft Entra SSO can be added later without changing student membership data.

insert into public.institutions (slug, name, institution_type, email_domain)
values ('monroe', 'Monroe University', 'university', 'monroeu.edu')
on conflict (slug) do update
set name = excluded.name,
    institution_type = excluded.institution_type,
    email_domain = excluded.email_domain;
