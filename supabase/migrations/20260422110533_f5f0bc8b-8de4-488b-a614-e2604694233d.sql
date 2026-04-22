CREATE OR REPLACE FUNCTION public._debug_order_check(_user_id uuid, _guest_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid()::text,
    'auth_uid_is_null', auth.uid() IS NULL,
    'input_user_id', _user_id::text,
    'input_user_id_is_null', _user_id IS NULL,
    'input_guest_email', _guest_email,
    'check_a', (auth.uid() IS NOT NULL AND auth.uid() = _user_id),
    'check_b', (auth.uid() IS NULL AND _user_id IS NULL AND _guest_email IS NOT NULL),
    'overall', ((auth.uid() IS NOT NULL AND auth.uid() = _user_id) OR (auth.uid() IS NULL AND _user_id IS NULL AND _guest_email IS NOT NULL))
  )
$$;
GRANT EXECUTE ON FUNCTION public._debug_order_check(uuid, text) TO anon, authenticated;