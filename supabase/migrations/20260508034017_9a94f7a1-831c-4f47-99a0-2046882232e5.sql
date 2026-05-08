ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_reminder_count integer NOT NULL DEFAULT 0;