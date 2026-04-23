-- Allow admins to delete orders. Cascading FKs already drop order_items, invoices, promo_code_redemptions.
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO public
USING (is_admin_or_whitelisted());