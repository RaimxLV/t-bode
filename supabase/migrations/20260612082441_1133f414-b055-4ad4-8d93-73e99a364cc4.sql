
-- Restrict campaigns.brief (and other internal columns) from public exposure.
-- Drop public SELECT policy and expose only id+title via a SECURITY DEFINER RPC.

DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns;

CREATE OR REPLACE FUNCTION public.get_public_active_campaigns()
RETURNS TABLE(id uuid, title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title
  FROM public.campaigns
  WHERE status = ANY (ARRAY['products_ready'::campaign_status, 'blog_ready'::campaign_status, 'completed'::campaign_status, 'active'::campaign_status]);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_active_campaigns() TO anon, authenticated;
