
-- 1) Add availability + manual print offset to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS always_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_offset_y NUMERIC,
  ADD COLUMN IF NOT EXISTS print_scale NUMERIC;

-- 2) Update public read policy to respect availability window
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'::product_status
    AND is_draft = false
    AND (
      always_available = true
      OR (
        (available_from IS NULL OR available_from <= now())
        AND (expires_at IS NULL OR expires_at > now())
      )
    )
  );

-- 3) Blog ↔ Product junction
CREATE TABLE IF NOT EXISTS public.blog_post_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blog_post_id, product_id)
);

GRANT SELECT ON public.blog_post_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_products TO authenticated;
GRANT ALL ON public.blog_post_products TO service_role;

ALTER TABLE public.blog_post_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read links to published posts" ON public.blog_post_products
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.id = blog_post_products.blog_post_id
        AND bp.status = 'published'::content_status
    )
  );

CREATE POLICY "Admins and workers manage links" ON public.blog_post_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

CREATE INDEX IF NOT EXISTS idx_blog_post_products_post ON public.blog_post_products(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_products_product ON public.blog_post_products(product_id);

-- 4) campaign_id on products so we can auto-link from blog by campaign
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS campaign_id UUID;
CREATE INDEX IF NOT EXISTS idx_products_campaign ON public.products(campaign_id);
