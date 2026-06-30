UPDATE public.order_items
SET zakeke_print_files = NULL
WHERE zakeke_design_id IS NOT NULL
  AND zakeke_print_files IS NOT NULL
  AND jsonb_typeof(zakeke_print_files) = 'array'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(zakeke_print_files) f
    WHERE f->>'designId' IS NULL
       OR f->>'designId' = zakeke_design_id
  );