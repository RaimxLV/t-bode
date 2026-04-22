-- Discount type enum
CREATE TYPE public.promo_discount_type AS ENUM ('percentage', 'fixed', 'free_shipping');

-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type public.promo_discount_type NOT NULL,
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_total numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Always store codes uppercase + trimmed
CREATE OR REPLACE FUNCTION public.normalize_promo_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  IF length(NEW.code) < 3 OR length(NEW.code) > 40 THEN
    RAISE EXCEPTION 'Promo code length must be 3-40 chars';
  END IF;
  IF NEW.discount_type = 'percentage' AND (NEW.discount_value < 0 OR NEW.discount_value > 100) THEN
    RAISE EXCEPTION 'Percentage discount must be 0-100';
  END IF;
  IF NEW.discount_type = 'fixed' AND NEW.discount_value < 0 THEN
    RAISE EXCEPTION 'Fixed discount must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_promo_code
BEFORE INSERT OR UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.normalize_promo_code();

CREATE TRIGGER trg_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promo codes"
ON public.promo_codes FOR SELECT
USING (is_admin_or_whitelisted());

CREATE POLICY "Admins can insert promo codes"
ON public.promo_codes FOR INSERT
WITH CHECK (is_admin_or_whitelisted());

CREATE POLICY "Admins can update promo codes"
ON public.promo_codes FOR UPDATE
USING (is_admin_or_whitelisted());

CREATE POLICY "Admins can delete promo codes"
ON public.promo_codes FOR DELETE
USING (is_admin_or_whitelisted());

-- Redemption audit log
CREATE TABLE public.promo_code_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  code_snapshot text NOT NULL,
  discount_amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_redemptions_code ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX idx_promo_redemptions_order ON public.promo_code_redemptions(order_id);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view redemptions"
ON public.promo_code_redemptions FOR SELECT
USING (is_admin_or_whitelisted());

-- Add columns to orders for promo tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Public validation function — used by checkout (anon-friendly)
-- Returns one row when valid, no rows when invalid (caller treats empty result as invalid)
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text, _order_total numeric)
RETURNS TABLE(
  code text,
  discount_type public.promo_discount_type,
  discount_value numeric,
  discount_amount numeric,
  min_order_total numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc public.promo_codes%ROWTYPE;
  computed_discount numeric := 0;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT * INTO pc
  FROM public.promo_codes
  WHERE promo_codes.code = upper(trim(_code))
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;
  IF NOT pc.is_active THEN RETURN; END IF;
  IF pc.valid_from > now() THEN RETURN; END IF;
  IF pc.valid_until IS NOT NULL AND pc.valid_until < now() THEN RETURN; END IF;
  IF pc.max_uses IS NOT NULL AND pc.used_count >= pc.max_uses THEN RETURN; END IF;
  IF _order_total < pc.min_order_total THEN RETURN; END IF;

  IF pc.discount_type = 'percentage' THEN
    computed_discount := round((_order_total * pc.discount_value / 100)::numeric, 2);
  ELSIF pc.discount_type = 'fixed' THEN
    computed_discount := least(pc.discount_value, _order_total);
  ELSE
    -- free_shipping: discount_amount represents shipping savings, frontend handles
    computed_discount := pc.discount_value;
  END IF;

  RETURN QUERY SELECT pc.code, pc.discount_type, pc.discount_value, computed_discount, pc.min_order_total;
END;
$$;

-- Atomic redemption — called from checkout edge function with service role.
-- Re-validates and increments used_count + writes audit row in one transaction.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  _code text,
  _order_id uuid,
  _order_total numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc public.promo_codes%ROWTYPE;
  computed_discount numeric := 0;
BEGIN
  SELECT * INTO pc
  FROM public.promo_codes
  WHERE promo_codes.code = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid promo code'; END IF;
  IF NOT pc.is_active THEN RAISE EXCEPTION 'Promo code inactive'; END IF;
  IF pc.valid_from > now() THEN RAISE EXCEPTION 'Promo code not yet valid'; END IF;
  IF pc.valid_until IS NOT NULL AND pc.valid_until < now() THEN RAISE EXCEPTION 'Promo code expired'; END IF;
  IF pc.max_uses IS NOT NULL AND pc.used_count >= pc.max_uses THEN RAISE EXCEPTION 'Promo code usage limit reached'; END IF;
  IF _order_total < pc.min_order_total THEN RAISE EXCEPTION 'Order total below minimum for this code'; END IF;

  IF pc.discount_type = 'percentage' THEN
    computed_discount := round((_order_total * pc.discount_value / 100)::numeric, 2);
  ELSIF pc.discount_type = 'fixed' THEN
    computed_discount := least(pc.discount_value, _order_total);
  ELSE
    computed_discount := pc.discount_value;
  END IF;

  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = pc.id;

  INSERT INTO public.promo_code_redemptions (promo_code_id, order_id, code_snapshot, discount_amount)
  VALUES (pc.id, _order_id, pc.code, computed_discount);

  RETURN computed_discount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO anon, authenticated;