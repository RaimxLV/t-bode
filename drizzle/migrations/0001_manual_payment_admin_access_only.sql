DROP POLICY IF EXISTS "Workers can read orders" ON public.orders;
CREATE OR REPLACE FUNCTION public.mark_order_manually_paid(_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_or_whitelisted() THEN
  RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
 END IF;
 UPDATE public.orders SET manually_paid_at=now(), manually_paid_by=auth.uid(), status=CASE WHEN status IN ('pending','cancelled') THEN 'processing'::public.order_status ELSE status END
 WHERE id=_order_id AND manually_paid_at IS NULL AND upper(coalesce(montonio_payment_status,'')) NOT IN ('PAID','FINALIZED');
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN affected=1;
END; $$;
REVOKE ALL ON FUNCTION public.mark_order_manually_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_manually_paid(uuid) TO authenticated, service_role;