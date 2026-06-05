ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'products_ready';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'blog_ready';
ALTER TABLE public.campaign_designs ADD COLUMN IF NOT EXISTS product_id uuid;