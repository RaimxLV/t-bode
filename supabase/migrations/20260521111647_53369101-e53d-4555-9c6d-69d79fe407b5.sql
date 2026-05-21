ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS products_is_draft_idx ON public.products(is_draft) WHERE is_draft = true;