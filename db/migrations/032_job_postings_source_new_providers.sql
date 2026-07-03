-- Widen job_postings.source for newly activated providers (same pattern as 029
-- amazon): dormant ATS adapters now seeded (smartrecruiters, rippling, jazzhr,
-- jobvite, teamtailor, bamboohr) plus single-board aggregator providers
-- (usajobs, remotive, remoteok, themuse). This CHECK gates every new provider —
-- widen it here whenever one is activated.
alter table public.job_postings
  drop constraint if exists job_postings_source_check;

alter table public.job_postings
  add constraint job_postings_source_check
  check (source in (
    'greenhouse', 'ashby', 'lever', 'jibe', 'workday', 'amazon', 'appone',
    'smartrecruiters', 'rippling', 'jazzhr', 'jobvite', 'teamtailor', 'bamboohr',
    'usajobs', 'remotive', 'remoteok', 'themuse'
  ));
