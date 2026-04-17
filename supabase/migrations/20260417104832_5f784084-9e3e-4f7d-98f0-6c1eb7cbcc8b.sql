-- 1) contact_submissions: validation trigger (length limits + safe file_url)
CREATE OR REPLACE FUNCTION public.validate_contact_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed_host_supabase TEXT := 'nkqwhiqrljwvzrivhqyh.supabase.co';
BEGIN
  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long';
  END IF;
  IF NEW.email IS NOT NULL AND length(NEW.email) > 320 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 50 THEN
    RAISE EXCEPTION 'Phone too long';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 5000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;
  -- Restrict file_url to our own Supabase storage public URL
  IF NEW.file_url IS NOT NULL AND NEW.file_url <> '' THEN
    IF NEW.file_url !~* ('^https://' || allowed_host_supabase || '/storage/v1/object/public/') THEN
      RAISE EXCEPTION 'Invalid file_url host';
    END IF;
    IF length(NEW.file_url) > 1024 THEN
      RAISE EXCEPTION 'file_url too long';
    END IF;
  END IF;
  -- Always force status to 'new' on insert from clients
  NEW.status := 'new';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_contact_submission_trigger ON public.contact_submissions;
CREATE TRIGGER validate_contact_submission_trigger
BEFORE INSERT ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_contact_submission();

-- 2) storage.objects: drop overly broad SELECT policy on product-images
-- Files remain reachable through the public CDN URL; we just block listing the bucket via PostgREST.
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

-- 3) order_items: tighten guest access — only admins can read guest order items
-- (existing "Users can view their own order items" stays for authenticated users)
DROP POLICY IF EXISTS "Users and guests can create order items" ON public.order_items;
CREATE POLICY "Users and guests can create order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_email IS NOT NULL)
      )
      -- Block inserts into orders that already have items (prevents tacking items onto someone else's guest order)
      AND NOT EXISTS (
        SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id
      )
  )
);