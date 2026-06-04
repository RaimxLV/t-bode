DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'product_status') THEN
    CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'campaign_type') THEN
    CREATE TYPE public.campaign_type AS ENUM ('holiday', 'collection', 'blog');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'campaign_status') THEN
    CREATE TYPE public.campaign_status AS ENUM ('draft', 'planned', 'active', 'completed', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'content_status') THEN
    CREATE TYPE public.content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_lv text NOT NULL,
  name_en text,
  month integer NOT NULL,
  day integer NOT NULL,
  prompt_theme text NOT NULL,
  lead_days integer NOT NULL DEFAULT 14,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT holidays_month_check CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT holidays_day_check CHECK (day BETWEEN 1 AND 31),
  CONSTRAINT holidays_name_lv_key UNIQUE (name_lv, month, day)
);
GRANT SELECT ON public.holidays TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active holidays are visible to everyone" ON public.holidays;
DROP POLICY IF EXISTS "Admins and workers can manage holidays" ON public.holidays;
CREATE POLICY "Active holidays are visible to everyone"
ON public.holidays
FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
CREATE POLICY "Admins and workers can manage holidays"
ON public.holidays
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
DROP TRIGGER IF EXISTS update_holidays_updated_at ON public.holidays;
CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.campaign_type NOT NULL DEFAULT 'holiday',
  status public.campaign_status NOT NULL DEFAULT 'draft',
  holiday_id uuid REFERENCES public.holidays(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins and workers can manage campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can view campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admins and workers can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.campaign_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text,
  is_primary boolean NOT NULL DEFAULT false,
  generation_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_designs TO authenticated;
GRANT ALL ON public.campaign_designs TO service_role;
ALTER TABLE public.campaign_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view campaign designs" ON public.campaign_designs;
DROP POLICY IF EXISTS "Admins and workers can manage campaign designs" ON public.campaign_designs;
CREATE POLICY "Authenticated users can view campaign designs"
ON public.campaign_designs
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admins and workers can manage campaign designs"
ON public.campaign_designs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
DROP TRIGGER IF EXISTS update_campaign_designs_updated_at ON public.campaign_designs;
CREATE TRIGGER update_campaign_designs_updated_at
BEFORE UPDATE ON public.campaign_designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image_url text,
  status public.content_status NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published blog posts are public" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins and workers can manage blog posts" ON public.blog_posts;
CREATE POLICY "Published blog posts are public"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
CREATE POLICY "Admins and workers can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'worker'));
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS holiday_id uuid REFERENCES public.holidays(id) ON DELETE SET NULL;

INSERT INTO public.holidays (name_lv, name_en, month, day, prompt_theme, lead_days, is_active)
VALUES
  ('Jaungads', 'New Year', 1, 1, 'new year celebration, fireworks, winter sparkle, festive gifts', 21, true),
  ('Lieldienas', 'Easter', 4, 20, 'spring easter, pastel colors, eggs, fresh seasonal gifts', 21, true),
  ('Mātes diena', 'Mothers Day', 5, 10, 'mothers day, warm gratitude, flowers, heartfelt gift ideas', 14, true),
  ('Līgo / Jāņi', 'Midsummer', 6, 23, 'latvian midsummer, wreaths, bonfire, meadow, festive apparel', 21, true),
  ('Latvijas dzimšanas diena', 'Latvia Independence Day', 11, 18, 'latvian independence day, patriotic red white palette, national pride', 21, true),
  ('Ziemassvētki', 'Christmas', 12, 24, 'christmas gifting, cozy winter, festive family celebration', 30, true)
ON CONFLICT (name_lv, month, day) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  prompt_theme = EXCLUDED.prompt_theme,
  lead_days = EXCLUDED.lead_days,
  is_active = EXCLUDED.is_active,
  updated_at = now();