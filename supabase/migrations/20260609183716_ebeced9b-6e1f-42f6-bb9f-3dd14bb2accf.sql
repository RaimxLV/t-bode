CREATE TABLE public.omniva_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  rate_limited BOOLEAN NOT NULL DEFAULT false,
  error_count INTEGER NOT NULL DEFAULT 0,
  deliveries JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  alert_sent BOOLEAN NOT NULL DEFAULT false
);

GRANT SELECT ON public.omniva_sync_logs TO authenticated;
GRANT ALL ON public.omniva_sync_logs TO service_role;

ALTER TABLE public.omniva_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.omniva_sync_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_whitelisted());

CREATE INDEX omniva_sync_logs_ran_at_idx ON public.omniva_sync_logs (ran_at DESC);