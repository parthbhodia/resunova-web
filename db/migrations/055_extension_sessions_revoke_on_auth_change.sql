-- Migration 055: revoke extension sessions when the account's credentials change
--
-- An extension session (053) is a separate credential from the browser's
-- Supabase session, so nothing in Supabase Auth knows to end it. Without this,
-- changing your password or being banned left every connected extension
-- working until its own expiry.
--
-- Fires on auth.users when encrypted_password changes (password change or
-- reset) or banned_until is set. Account deletion is already covered by the
-- ON DELETE CASCADE on extension_sessions.user_id.
--
-- Signing out is handled in the app instead (signOutAndReturnHome calls
-- POST /api/extension/revoke-all): Supabase sign-out does not write to
-- auth.users, so no trigger here could see it.
--
-- Run in Supabase SQL Editor -> New query. Safe to re-run.

create or replace function public.revoke_extension_sessions_on_auth_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.extension_sessions
     set revoked_at = now()
   where user_id = new.id
     and revoked_at is null;
  return new;
end;
$$;

-- New functions are EXECUTE-able by PUBLIC by default, and revoking from
-- anon/authenticated alone removes nothing (they hold it through PUBLIC).
-- Only the trigger needs to run this.
revoke all on function public.revoke_extension_sessions_on_auth_change() from public, anon, authenticated;

drop trigger if exists extension_sessions_revoke_on_auth_change on auth.users;
create trigger extension_sessions_revoke_on_auth_change
  after update of encrypted_password, banned_until on auth.users
  for each row
  when (
    old.encrypted_password is distinct from new.encrypted_password
    or (new.banned_until is not null and new.banned_until is distinct from old.banned_until)
  )
  execute function public.revoke_extension_sessions_on_auth_change();
