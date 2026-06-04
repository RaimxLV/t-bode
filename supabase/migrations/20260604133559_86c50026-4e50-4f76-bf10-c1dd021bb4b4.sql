
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS office_address_lv text DEFAULT 'Braslas iela 29, Ieeja D, Rīga, LV-1084',
  ADD COLUMN IF NOT EXISTS office_address_en text DEFAULT 'Braslas iela 29, Entrance D, Riga, LV-1084',
  ADD COLUMN IF NOT EXISTS office_hours_lv text DEFAULT 'Pirmdiena–ceturtdiena: 9:00–17:30
Piektdiena: 9:00–16:00
Sestdiena, svētdiena: slēgts',
  ADD COLUMN IF NOT EXISTS office_hours_en text DEFAULT 'Monday–Thursday: 9:00–17:30
Friday: 9:00–16:00
Saturday, Sunday: closed',
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'info@t-bode.lv',
  ADD COLUMN IF NOT EXISTS pickup_intro_lv text DEFAULT 'Tavs pasūtījums ir izgatavots un gaida Tevi mūsu birojā. Iepriekšēja saskaņošana nav nepieciešama — vienkārši ieej biroja darba laikā.',
  ADD COLUMN IF NOT EXISTS pickup_intro_en text DEFAULT 'Your order is ready and waiting at our office. No appointment needed — just drop by during office hours.';

DROP FUNCTION IF EXISTS public.get_public_settings();

CREATE OR REPLACE FUNCTION public.get_public_settings()
 RETURNS TABLE(
   company_name text,
   company_reg_number text,
   company_vat_number text,
   company_address text,
   payment_instructions_lv text,
   payment_instructions_en text,
   office_address_lv text,
   office_address_en text,
   office_hours_lv text,
   office_hours_en text,
   support_email text,
   pickup_intro_lv text,
   pickup_intro_en text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_name, company_reg_number, company_vat_number,
         company_address, payment_instructions_lv, payment_instructions_en,
         office_address_lv, office_address_en, office_hours_lv, office_hours_en,
         support_email, pickup_intro_lv, pickup_intro_en
  FROM public.site_settings
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated, service_role;
