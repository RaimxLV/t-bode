-- Add payment_method and manual payment tracking to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS manually_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_paid_by uuid;

-- Constrain payment_method values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('card', 'bank_transfer'));
  END IF;
END $$;

-- Site settings (single-row table for company / bank details)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'SIA Ervitex',
  company_reg_number text DEFAULT '',
  company_vat_number text DEFAULT '',
  company_address text DEFAULT '',
  bank_name text NOT NULL DEFAULT 'Swedbank',
  bank_iban text NOT NULL DEFAULT 'LV00HABA0000000000000',
  bank_swift text NOT NULL DEFAULT 'HABALV22',
  bank_beneficiary text NOT NULL DEFAULT 'SIA Ervitex',
  payment_instructions_lv text DEFAULT 'Lūdzu norādiet pasūtījuma numuru maksājuma mērķī. Apmaksas termiņš — 3 darba dienas.',
  payment_instructions_en text DEFAULT 'Please include the order number in the payment reference. Payment is due within 3 business days.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed one row if empty
INSERT INTO public.site_settings (company_name)
SELECT 'SIA Ervitex'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Anyone can view settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings"
  ON public.site_settings FOR UPDATE
  USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
CREATE POLICY "Admins can insert settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.is_admin_or_whitelisted());

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();