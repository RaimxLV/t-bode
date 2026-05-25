
CREATE OR REPLACE FUNCTION public.prevent_duplicate_pending_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_order_number INTEGER;
  email_lc TEXT;
BEGIN
  email_lc := lower(coalesce(NEW.guest_email, ''));
  IF email_lc = '' THEN RETURN NEW; END IF;

  -- Look for a matching pending order created in the last 10 minutes
  SELECT order_number INTO existing_order_number
  FROM public.orders
  WHERE lower(guest_email) = email_lc
    AND payment_method = NEW.payment_method
    AND status = 'pending'
    AND round(total::numeric, 2) = round(NEW.total::numeric, 2)
    AND created_at > (now() - interval '10 minutes')
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_order_number IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_PENDING_ORDER:%', existing_order_number
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_pending_orders_trg ON public.orders;
CREATE TRIGGER prevent_duplicate_pending_orders_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_pending_orders();

-- Also ensure the existing validate_new_order trigger is attached
DROP TRIGGER IF EXISTS validate_new_order_trg ON public.orders;
CREATE TRIGGER validate_new_order_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_new_order();
