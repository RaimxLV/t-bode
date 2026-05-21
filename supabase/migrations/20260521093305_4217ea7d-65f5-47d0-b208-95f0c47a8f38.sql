ALTER TABLE public.base_products
  ADD COLUMN IF NOT EXISTS mockup_width_cm numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mockup_height_cm numeric NOT NULL DEFAULT 70;