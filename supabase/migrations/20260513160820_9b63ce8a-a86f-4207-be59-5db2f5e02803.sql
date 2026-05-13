-- 1) CRITICAL: Realtime subscriptions limited to admins
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can receive realtime messages" ON realtime.messages;
CREATE POLICY "Admins can receive realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_whitelisted());

-- 2) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.next_invoice_number(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(integer) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_whitelisted(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_whitelisted(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_or_whitelisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_whitelisted() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_bank_transfer_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_transfer_details(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public._can_insert_order_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._can_insert_order_item(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_promo_code(text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, numeric) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated, service_role;
