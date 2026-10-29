/*
# FindIt — Security hardening

1. Changes
- public_profiles view: switch to security_invoker so it enforces the caller's RLS context rather than the owner's. The view only exposes id, full_name, avatar_url (display fields), so it's safe for public read.
- set_updated_at trigger function: set search_path to public to resolve the mutable search_path warning.
- handle_new_user: revoke EXECUTE from authenticated (it's a trigger function, only the trigger should fire it; direct RPC calls are unnecessary).
*/

CREATE OR REPLACE VIEW public_profiles WITH (security_invoker = true) AS
  SELECT id, full_name, avatar_url FROM profiles;
ALTER VIEW public_profiles OWNER TO postgres;
GRANT SELECT ON public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
