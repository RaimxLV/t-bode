GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT ON public.orders TO anon, authenticated;
GRANT SELECT ON public.order_items TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.orders_order_number_seq TO anon, authenticated;