-- Clear all order history & related data, reset counters
DELETE FROM public.promo_code_redemptions;
DELETE FROM public.processed_webhook_events;
DELETE FROM public.invoices;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.email_send_log;

-- Reset order number sequence so next order starts at #0001
ALTER SEQUENCE public.orders_order_number_seq RESTART WITH 1;

-- Reset invoice numbering
DELETE FROM public.invoice_sequences;

-- Reset promo code usage counters
UPDATE public.promo_codes SET used_count = 0;