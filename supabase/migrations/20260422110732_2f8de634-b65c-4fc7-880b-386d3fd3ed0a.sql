-- Helper that bypasses RLS on orders so the order_items policy can verify ownership
CREATE OR REPLACE FUNCTION public._can_insert_order_item(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_email IS NOT NULL)
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public._can_insert_order_item(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Users and guests can create order items" ON public.order_items;

CREATE POLICY "Users and guests can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (public._can_insert_order_item(order_id));