-- Make a nudge one atomic update so two clicks cannot both pass the cap.
-- Additive on 048. Apply in the Supabase SQL editor.

create or replace function public.nudge_referral_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
  row public.company_referral_requests%rowtype;
begin
  update public.company_referral_requests
  set nudge_count = nudge_count + 1,
      last_nudged_at = now()
  where id = request_id
    and candidate_user_id = auth.uid()
    and status in ('requested', 'reviewing')
    and created_at <= now() - interval '3 days'
    and nudge_count < 2
    and (last_nudged_at is null or last_nudged_at <= now() - interval '7 days');

  get diagnostics updated_count = row_count;
  if updated_count = 1 then
    return;
  end if;

  select * into row
  from public.company_referral_requests
  where id = request_id;
  if not found or row.candidate_user_id is distinct from auth.uid() then
    raise exception 'not your request';
  end if;
  if row.status not in ('requested', 'reviewing') then
    raise exception 'this request can no longer be nudged';
  end if;
  if row.created_at > now() - interval '3 days' then
    raise exception 'you can nudge 3 days after asking';
  end if;
  if row.nudge_count >= 2 then
    raise exception 'nudge limit reached';
  end if;
  raise exception 'nudged recently';
end;
$$;

revoke all on function public.nudge_referral_request(uuid) from public;
grant execute on function public.nudge_referral_request(uuid) to authenticated;
