-- Add Montonio fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS montonio_order_uuid text,
  ADD COLUMN IF NOT EXISTS montonio_payment_status text,
  ADD COLUMN IF NOT EXISTS montonio_payment_method text,
  ADD COLUMN IF NOT EXISTS montonio_shipping_method_code text,
  ADD COLUMN IF NOT EXISTS montonio_pickup_point_id text,
  ADD COLUMN IF NOT EXISTS montonio_pickup_point_name text,
  ADD COLUMN IF NOT EXISTS montonio_tracking_number text,
  ADD COLUMN IF NOT EXISTS montonio_shipment_id text;

CREATE INDEX IF NOT EXISTS idx_orders_montonio_order_uuid ON public.orders(montonio_order_uuid);