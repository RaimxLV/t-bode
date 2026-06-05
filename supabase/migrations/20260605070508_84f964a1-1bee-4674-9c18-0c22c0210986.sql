ALTER TABLE public.products ADD COLUMN IF NOT EXISTS print_area JSONB DEFAULT '{"x":0.3,"y":0.25,"w":0.4,"h":0.45}'::jsonb;

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS auto_started_at TIMESTAMPTZ;