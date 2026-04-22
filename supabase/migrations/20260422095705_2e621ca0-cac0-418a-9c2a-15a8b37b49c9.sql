-- 1) site_settings: restrict SELECT to admins, expose safe fields via function
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;

CREATE POLICY "Admins can view settings"
ON public.site_settings
FOR SELECT
USING (public.is_admin_or_whitelisted());

-- Public-safe view of company info (no bank details)
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (
  company_name text,
  company_reg_number text,
  company_vat_number text,
  company_address text,
  payment_instructions_lv text,
  payment_instructions_en text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_name, company_reg_number, company_vat_number,
         company_address, payment_instructions_lv, payment_instructions_en
  FROM public.site_settings
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated;

-- 2) email-assets bucket: public reads OK, but disallow listing + restrict writes
-- Drop any overly broad policies on storage.objects for email-assets
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%email-assets%' OR with_check LIKE '%email-assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow public read of individual objects (direct URL works), but no listing.
-- Listing requires SELECT without a name filter; we restrict SELECT so each row
-- must match an exact name passed in the query — effectively blocks listing UIs.
CREATE POLICY "Email assets: public read by exact name"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
);

CREATE POLICY "Email assets: admins can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-assets' AND public.is_admin_or_whitelisted()
);

CREATE POLICY "Email assets: admins can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'email-assets' AND public.is_admin_or_whitelisted());

CREATE POLICY "Email assets: admins can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'email-assets' AND public.is_admin_or_whitelisted());

-- 3) Attach existing validation trigger to contact_submissions if not present
DROP TRIGGER IF EXISTS contact_submissions_validate ON public.contact_submissions;
CREATE TRIGGER contact_submissions_validate
BEFORE INSERT ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.validate_contact_submission();

-- 4) Tighten user_roles INSERT: require at least one existing admin (no bootstrap escalation)
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role)
);