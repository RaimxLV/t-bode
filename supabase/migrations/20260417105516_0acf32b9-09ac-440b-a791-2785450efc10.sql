-- Centralized helper: true if caller is a DB admin OR is whitelisted by email
CREATE OR REPLACE FUNCTION public.is_admin_or_whitelisted()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      auth.email() IS NOT NULL
      AND public.is_admin_whitelisted(auth.email())
    )
$$;

-- ===== products =====
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT TO public WITH CHECK (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO public USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO public USING (public.is_admin_or_whitelisted());

-- ===== categories =====
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories
FOR UPDATE TO authenticated USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories
FOR DELETE TO authenticated USING (public.is_admin_or_whitelisted());

-- ===== faqs =====
DROP POLICY IF EXISTS "Admins can insert FAQs" ON public.faqs;
CREATE POLICY "Admins can insert FAQs" ON public.faqs
FOR INSERT TO public WITH CHECK (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update FAQs" ON public.faqs;
CREATE POLICY "Admins can update FAQs" ON public.faqs
FOR UPDATE TO public USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete FAQs" ON public.faqs;
CREATE POLICY "Admins can delete FAQs" ON public.faqs
FOR DELETE TO public USING (public.is_admin_or_whitelisted());

-- ===== orders =====
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
FOR SELECT TO public USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
FOR UPDATE TO public USING (public.is_admin_or_whitelisted());

-- ===== order_items =====
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT TO public USING (public.is_admin_or_whitelisted());

-- ===== contact_submissions =====
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view all submissions" ON public.contact_submissions
FOR SELECT TO authenticated USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update submissions" ON public.contact_submissions
FOR UPDATE TO authenticated USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete submissions" ON public.contact_submissions;
CREATE POLICY "Admins can delete submissions" ON public.contact_submissions
FOR DELETE TO authenticated USING (public.is_admin_or_whitelisted());

-- ===== admin_whitelist =====
DROP POLICY IF EXISTS "Admins can view whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can view whitelist" ON public.admin_whitelist
FOR SELECT TO authenticated USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can insert whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can insert whitelist" ON public.admin_whitelist
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can update whitelist" ON public.admin_whitelist
FOR UPDATE TO authenticated USING (public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can delete whitelist" ON public.admin_whitelist
FOR DELETE TO authenticated USING (public.is_admin_or_whitelisted());

-- ===== storage.objects (product-images) =====
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin_or_whitelisted());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin_or_whitelisted());

-- NOTE: user_roles policies intentionally NOT changed — only true DB admins
-- can manage roles, to prevent privilege escalation from whitelist to DB role.