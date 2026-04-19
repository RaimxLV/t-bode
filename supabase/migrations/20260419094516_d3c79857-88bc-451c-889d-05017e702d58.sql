DROP POLICY IF EXISTS "Users and guests can create order items" ON public.order_items;

CREATE POLICY "Users and guests can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_email IS NOT NULL)
      )
  )
);