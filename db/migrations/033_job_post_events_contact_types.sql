-- Allow hiring-contact engagement events on job_post_events so we can measure
-- how many users actually use the contacts feature (gated reveal → copy/email).
alter table public.job_post_events
  drop constraint if exists job_post_events_event_type_check;

alter table public.job_post_events
  add constraint job_post_events_event_type_check
  check (event_type in (
    'apply_click', 'save', 'hide',
    'contact_reveal', 'contact_copy', 'contact_email'
  ));
