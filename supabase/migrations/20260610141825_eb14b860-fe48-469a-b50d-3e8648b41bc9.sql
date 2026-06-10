
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mockup_image_url text;

GRANT SELECT ON public.campaigns TO anon;

DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns;
CREATE POLICY "Public can view active campaigns" ON public.campaigns
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('products_ready', 'blog_ready', 'completed', 'active'));
