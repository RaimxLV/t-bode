-- ============================================================
-- 1. Invoice sequences (year-based, race-safe)
-- ============================================================
CREATE TABLE public.invoice_sequences (
  year INTEGER PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sequences"
  ON public.invoice_sequences FOR SELECT
  USING (is_admin_or_whitelisted());

-- ============================================================
-- 2. Invoices table
-- ============================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  pdf_path TEXT NOT NULL,
  buyer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  seller_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  net_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_current BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_number, version)
);

CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_current ON public.invoices(order_id) WHERE is_current = true;
CREATE INDEX idx_invoices_generated_at ON public.invoices(generated_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (is_admin_or_whitelisted());

CREATE POLICY "Admins can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (is_admin_or_whitelisted());

CREATE POLICY "Admins can update invoices"
  ON public.invoices FOR UPDATE
  USING (is_admin_or_whitelisted());

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE
  USING (is_admin_or_whitelisted());

-- Users can see their own invoices (for Profile page later)
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = invoices.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Atomic invoice number generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number(_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y INTEGER := COALESCE(_year, EXTRACT(YEAR FROM now())::INTEGER);
  next_n INTEGER;
BEGIN
  INSERT INTO public.invoice_sequences (year, counter)
  VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE
    SET counter = invoice_sequences.counter + 1,
        updated_at = now()
  RETURNING counter INTO next_n;

  RETURN 'TB-' || y::TEXT || '-' || LPAD(next_n::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- 4. Extend site_settings with logo/stamp URLs
-- ============================================================
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS stamp_url TEXT;

-- ============================================================
-- 5. Storage bucket for invoices (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can view invoice files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND is_admin_or_whitelisted());

CREATE POLICY "Admins can upload invoice files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices' AND is_admin_or_whitelisted());

CREATE POLICY "Admins can update invoice files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoices' AND is_admin_or_whitelisted());

CREATE POLICY "Admins can delete invoice files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoices' AND is_admin_or_whitelisted());

-- Service role (edge functions using service role key) bypasses RLS automatically.

-- Allow public storage access for company-assets (logo/stamp) inside existing email-assets bucket.
-- We will store logo/stamp in email-assets since it's already public — URLs saved in site_settings.