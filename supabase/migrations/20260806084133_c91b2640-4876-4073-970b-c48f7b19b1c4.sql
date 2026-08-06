-- 1. Categories
CREATE TABLE public.content_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_lv TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description_lv TEXT,
  icon_key TEXT,
  accent TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_categories TO authenticated;
GRANT ALL ON public.content_categories TO service_role;

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active content categories"
  ON public.content_categories FOR SELECT
  USING (is_active = true OR public.is_admin_or_whitelisted() OR public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Staff can manage content categories"
  ON public.content_categories FOR ALL
  TO authenticated
  USING (public.is_admin_or_whitelisted() OR public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (public.is_admin_or_whitelisted() OR public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON public.content_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Topic bank
CREATE TABLE public.content_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_lv TEXT NOT NULL,
  category_id UUID REFERENCES public.content_categories(id) ON DELETE SET NULL,
  primary_keyword TEXT,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  angle_hint TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'idea',
  holiday_id UUID REFERENCES public.holidays(id) ON DELETE SET NULL,
  planned_month DATE,
  used_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_topics_status ON public.content_topics(status, priority);
CREATE INDEX idx_content_topics_category ON public.content_topics(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_topics TO authenticated;
GRANT ALL ON public.content_topics TO service_role;

ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage content topics"
  ON public.content_topics FOR ALL
  TO authenticated
  USING (public.is_admin_or_whitelisted() OR public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (public.is_admin_or_whitelisted() OR public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE TRIGGER update_content_topics_updated_at
  BEFORE UPDATE ON public.content_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. blog_posts additions
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.content_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.content_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS reading_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_schedule ON public.blog_posts(status, scheduled_for);

-- 4. Seed categories
INSERT INTO public.content_categories (name_lv, slug, description_lv, icon_key, sort_order)
VALUES
  ('Drukas tehnoloģijas', 'drukas-tehnologijas', 'DTF, DTG, sietspiede, sublimācija un vinils — kā tās atšķiras un kuru izvēlēties.', 'Printer', 1),
  ('Idejas un dāvanas', 'idejas-un-davanas', 'Personalizētas dāvanu idejas komandām, ģimenei un draugiem.', 'Gift', 2),
  ('Svētki', 'svetki', 'Sezonālas idejas un iedvesma Latvijas svētkiem.', 'PartyPopper', 3)
ON CONFLICT (slug) DO NOTHING;

-- 5. Map existing campaign-based posts to "Svētki"
UPDATE public.blog_posts bp
SET category_id = (SELECT id FROM public.content_categories WHERE slug = 'svetki')
WHERE bp.category_id IS NULL;