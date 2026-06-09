ALTER TABLE public.products ADD COLUMN IF NOT EXISTS design_id uuid REFERENCES public.campaign_designs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_design_id ON public.products(design_id);
