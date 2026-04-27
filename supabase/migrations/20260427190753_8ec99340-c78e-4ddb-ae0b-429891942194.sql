
-- 1. Aizliegt admin lomu pievienošanu caur RLS (to var darīt tikai service_role/migrācijas)
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Atļaut adminiem pievienot/dzēst tikai NE-admin lomas (moderator, user)
CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
);

CREATE POLICY "Admins can update non-admin roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND role <> 'admin'::public.app_role)
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND role <> 'admin'::public.app_role);

CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
);

-- 2. Atsaukt PUBLIC EXECUTE no SECURITY DEFINER funkcijām, kuras nav paredzētas anonīmiem
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_whitelisted(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_whitelisted() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_promo_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_contact_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._can_insert_order_item(uuid) FROM PUBLIC, anon;

-- Atstāt EXECUTE tikai authenticated tām funkcijām, kuras lieto RLS politikās
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_whitelisted(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_whitelisted() TO authenticated;
GRANT EXECUTE ON FUNCTION public._can_insert_order_item(uuid) TO authenticated, anon;

-- Publiskās funkcijas (klients sauc tieši) — atstāt
-- get_public_settings, get_bank_transfer_details, validate_promo_code paliek pieejamas
