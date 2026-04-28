ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS zakeke_order_id text;

CREATE INDEX IF NOT EXISTS idx_order_items_zakeke_order_id
  ON public.order_items (zakeke_order_id)
  WHERE zakeke_order_id IS NOT NULL;