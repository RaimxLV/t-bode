
-- Add sequential order number
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders(order_number);
