CREATE OR REPLACE FUNCTION public._debug_auth()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'uid', auth.uid()::text,
    'uid_is_null', auth.uid() IS NULL,
    'role', auth.role(),
    'current_user', current_user::text
  )
$$;
GRANT EXECUTE ON FUNCTION public._debug_auth() TO anon, authenticated;