CREATE OR REPLACE FUNCTION public.get_bank_transfer_details(_order_id uuid)
RETURNS TABLE (
  company_name text,
  bank_name text,
  bank_iban text,
  bank_swift text,
  bank_beneficiary text,
  payment_instructions_lv text,
  payment_instructions_en text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.company_name, s.bank_name, s.bank_iban, s.bank_swift, s.bank_beneficiary,
         s.payment_instructions_lv, s.payment_instructions_en
  FROM public.site_settings s
  WHERE EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND o.payment_method = 'bank_transfer'
  )
  LIMIT 1;
$$;