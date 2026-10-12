-- Migration 046: do not leave SECURITY DEFINER trigger functions executable by PUBLIC.
revoke all on function public.company_referral_requests_insert_guard() from public;
revoke all on function public.company_referral_requests_status_only() from public;
grant execute on function public.company_referral_requests_insert_guard() to anon, authenticated, service_role;
grant execute on function public.company_referral_requests_status_only() to authenticated, service_role;
