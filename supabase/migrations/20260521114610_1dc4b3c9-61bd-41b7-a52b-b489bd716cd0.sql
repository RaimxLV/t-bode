ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS base_unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS print_unit_price numeric NOT NULL DEFAULT 0;

-- Backfill existing rows: assume entire unit_price is the product (no split known historically).
UPDATE public.order_items
SET base_unit_price = unit_price,
    print_unit_price = 0
WHERE base_unit_price = 0 AND print_unit_price = 0;