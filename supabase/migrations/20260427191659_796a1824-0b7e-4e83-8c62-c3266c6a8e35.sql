CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'lv',
  source text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscribers"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscribers"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers (email);