CREATE OR REPLACE FUNCTION public.is_admin_or_whitelisted()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  IF public.has_role(uid, 'admin'::public.app_role) THEN
    RETURN true;
  END IF;
  em := auth.email();
  IF em IS NULL OR em = '' THEN
    SELECT email INTO em FROM auth.users WHERE id = uid;
  END IF;
  IF em IS NULL OR em = '' THEN
    RETURN false;
  END IF;
  RETURN public.is_admin_whitelisted(em);
END;
$$;