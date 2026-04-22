ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS last_payment_reminder_at timestamptz;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;