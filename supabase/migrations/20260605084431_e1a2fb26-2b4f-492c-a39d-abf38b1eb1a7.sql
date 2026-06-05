DROP POLICY IF EXISTS "Public read generated-mockups" ON storage.objects;

CREATE POLICY "Admins read generated-mockups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-mockups' AND is_admin_or_whitelisted());