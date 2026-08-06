DROP POLICY IF EXISTS "Anyone can view active content categories" ON public.content_categories;

CREATE POLICY "Public can view active content categories"
ON public.content_categories
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Signed-in users can view content categories"
ON public.content_categories
FOR SELECT
TO authenticated
USING (
  is_active = true
  OR public.is_admin_or_whitelisted()
  OR public.has_role(auth.uid(), 'worker'::public.app_role)
);