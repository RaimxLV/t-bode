DROP POLICY IF EXISTS "Admins and workers can view campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and workers can upload campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and workers can update campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and workers can delete campaign assets" ON storage.objects;

CREATE POLICY "Admins and workers can view campaign assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
);

CREATE POLICY "Admins and workers can upload campaign assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
);

CREATE POLICY "Admins and workers can update campaign assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
)
WITH CHECK (
  bucket_id = 'campaign-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
);

CREATE POLICY "Admins and workers can delete campaign assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
);