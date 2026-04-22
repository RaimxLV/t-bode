-- Admins: full access on invoices bucket
CREATE POLICY "Admins manage invoice files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'invoices' AND public.is_admin_or_whitelisted())
WITH CHECK (bucket_id = 'invoices' AND public.is_admin_or_whitelisted());

-- Order owners: read-only on their own invoice folder (first path segment = order_id)
CREATE POLICY "Order owners view their invoice files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
  )
);