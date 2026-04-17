ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS omniva_barcode TEXT,
  ADD COLUMN IF NOT EXISTS omniva_tracking_status TEXT,
  ADD COLUMN IF NOT EXISTS omniva_label_url TEXT,
  ADD COLUMN IF NOT EXISTS omniva_shipment_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tracking_email_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_omniva_barcode ON public.orders(omniva_barcode) WHERE omniva_barcode IS NOT NULL;