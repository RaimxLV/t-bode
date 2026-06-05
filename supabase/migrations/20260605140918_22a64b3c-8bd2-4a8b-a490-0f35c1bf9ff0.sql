
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'digital_illustration';
ALTER TABLE public.campaign_designs ADD COLUMN IF NOT EXISTS style TEXT;
