-- Allow source='amazon' — the first bespoke closed-portal provider
-- (amazon.jobs public search.json). The source CHECK constraint previously
-- only permitted the ATS providers (greenhouse/ashby/lever/jibe/workday), so
-- Amazon rows would fail to insert without this.
--
-- Applied to prod project on 2026-06-30.

ALTER TABLE job_postings DROP CONSTRAINT job_postings_source_check;
ALTER TABLE job_postings ADD CONSTRAINT job_postings_source_check
  CHECK (source = ANY (ARRAY['greenhouse', 'ashby', 'lever', 'jibe', 'workday', 'amazon']));
