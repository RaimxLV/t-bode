ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS transparent_bg boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_style_id text,
  ADD COLUMN IF NOT EXISTS image_size text NOT NULL DEFAULT 'square_hd',
  ADD COLUMN IF NOT EXISTS preferred_colors jsonb NOT NULL DEFAULT '[]'::jsonb;