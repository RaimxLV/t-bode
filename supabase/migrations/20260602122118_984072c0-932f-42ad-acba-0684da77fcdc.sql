ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_sizes jsonb NULL,
  ADD COLUMN IF NOT EXISTS is_bulk boolean NOT NULL DEFAULT false;