-- Fix orders INSERT policy to explicitly allow anon (guest) and authenticated users
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;

CREATE POLICY "Users and guests can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND user_id IS NULL AND guest_email IS NOT NULL)
);

-- Fix order_items INSERT policy similarly
DROP POLICY IF EXISTS "Users and guests can create order items" ON public.order_items;

CREATE POLICY "Users and guests can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR
        (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_email IS NOT NULL)
      )
  )
);