ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_opened_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_admin_opened_at_idx ON public.orders (admin_opened_at);