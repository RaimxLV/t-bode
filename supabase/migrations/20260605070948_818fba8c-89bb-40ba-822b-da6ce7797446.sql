DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaign designs" ON public.campaign_designs;
-- The existing "Admins and workers can manage campaigns/campaign_designs" ALL policies cover SELECT for those roles.