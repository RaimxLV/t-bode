-- Fix search_path on functions missing it
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- Revoke EXECUTE from anon/public on functions that should not be callable by unauthenticated clients
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._can_insert_order_item(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_bank_transfer_details(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_whitelisted(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_whitelisted() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;