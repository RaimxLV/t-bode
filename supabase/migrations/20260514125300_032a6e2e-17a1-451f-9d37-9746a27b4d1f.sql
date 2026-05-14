DROP POLICY IF EXISTS "Admins can view product images" ON storage.objects;
CREATE POLICY "Admins can view product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin_or_whitelisted()
);