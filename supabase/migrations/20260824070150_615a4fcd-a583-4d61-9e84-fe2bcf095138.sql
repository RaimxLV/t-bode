-- Internal-only functions: server-side (service_role) callers only.
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, numeric) FROM anon, authenticated;

-- Trigger functions never need direct EXECUTE from clients.
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_pending_orders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_new_order() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, numeric) TO service_role;