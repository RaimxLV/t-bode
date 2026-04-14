
-- Create admin whitelist table
CREATE TABLE public.admin_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view whitelist"
ON public.admin_whitelist FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert whitelist"
ON public.admin_whitelist FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update whitelist"
ON public.admin_whitelist FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete whitelist"
ON public.admin_whitelist FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can check if their own email is whitelisted
CREATE POLICY "Users can check own email"
ON public.admin_whitelist FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.email()));

-- Helper function
CREATE OR REPLACE FUNCTION public.is_admin_whitelisted(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist WHERE lower(email) = lower(_email)
  )
$$;

-- Enable realtime for whitelist changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_whitelist;
