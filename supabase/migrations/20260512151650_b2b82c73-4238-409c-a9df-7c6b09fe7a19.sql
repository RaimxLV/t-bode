ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS zakeke_files_downloaded_at timestamptz;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS zakeke_files_downloaded_by uuid;

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
USING (public.is_admin_or_whitelisted())
WITH CHECK (public.is_admin_or_whitelisted());