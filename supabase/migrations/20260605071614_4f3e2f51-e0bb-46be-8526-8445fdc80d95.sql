-- Fix 1: Restrict products SELECT for public to published, non-draft, non-expired
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

CREATE POLICY "Public can view published products"
ON public.products FOR SELECT
TO anon, authenticated
USING (
  status = 'published'::product_status
  AND is_draft = false
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Admins and workers can view all products"
ON public.products FOR SELECT
TO authenticated
USING (
  is_admin_or_whitelisted()
  OR has_role(auth.uid(), 'worker'::app_role)
);

-- Fix 2: Remove orders table from realtime publication to prevent PII broadcast risk
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;