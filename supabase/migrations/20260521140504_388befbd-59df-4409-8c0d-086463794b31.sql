
UPDATE public.order_items oi
SET base_unit_price = ROUND(p.price::numeric, 2),
    print_unit_price = ROUND((oi.unit_price - p.price)::numeric, 2)
FROM public.products p
WHERE oi.product_id = p.id
  AND COALESCE(oi.print_unit_price, 0) = 0
  AND oi.unit_price > p.price;
