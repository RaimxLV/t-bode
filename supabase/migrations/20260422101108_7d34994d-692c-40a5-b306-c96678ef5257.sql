CREATE TABLE public.email_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_message_id ON public.email_send_log(message_id);
CREATE INDEX idx_email_send_log_created_at ON public.email_send_log(created_at DESC);
CREATE INDEX idx_email_send_log_template ON public.email_send_log(template_name);
CREATE INDEX idx_email_send_log_status ON public.email_send_log(status);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email log"
ON public.email_send_log FOR SELECT
USING (is_admin_or_whitelisted());

CREATE POLICY "Admins can delete email log"
ON public.email_send_log FOR DELETE
USING (is_admin_or_whitelisted());