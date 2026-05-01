
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS zakeke_order_item_id text,
  ADD COLUMN IF NOT EXISTS zakeke_print_files jsonb;

CREATE INDEX IF NOT EXISTS idx_order_items_zakeke_order_item_id
  ON public.order_items (zakeke_order_item_id)
  WHERE zakeke_order_item_id IS NOT NULL;
