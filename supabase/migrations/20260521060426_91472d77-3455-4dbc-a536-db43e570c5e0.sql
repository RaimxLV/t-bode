
-- Categories for designs
CREATE TABLE public.design_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.design_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage design_categories" ON public.design_categories
  FOR ALL TO authenticated USING (is_admin_or_whitelisted()) WITH CHECK (is_admin_or_whitelisted());

-- Design PNG library
CREATE TABLE public.design_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  category_id UUID REFERENCES public.design_categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_design_library_category ON public.design_library(category_id);
CREATE INDEX idx_design_library_created ON public.design_library(created_at DESC);
ALTER TABLE public.design_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage design_library" ON public.design_library
  FOR ALL TO authenticated USING (is_admin_or_whitelisted()) WITH CHECK (is_admin_or_whitelisted());

-- Base product templates (one row per product+color, with print area)
CREATE TABLE public.base_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  name TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  mockup_path TEXT NOT NULL,
  print_area JSONB NOT NULL DEFAULT '{"x":0.3,"y":0.25,"w":0.4,"h":0.45}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_base_products_product ON public.base_products(product_id);
ALTER TABLE public.base_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage base_products" ON public.base_products
  FOR ALL TO authenticated USING (is_admin_or_whitelisted()) WITH CHECK (is_admin_or_whitelisted());

-- Bulk generation jobs
CREATE TABLE public.bulk_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft',
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bulk_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bulk_generation_jobs" ON public.bulk_generation_jobs
  FOR ALL TO authenticated USING (is_admin_or_whitelisted()) WITH CHECK (is_admin_or_whitelisted());

-- Generated mockups (results)
CREATE TABLE public.generated_mockups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.bulk_generation_jobs(id) ON DELETE CASCADE,
  design_id UUID REFERENCES public.design_library(id) ON DELETE CASCADE,
  base_product_id UUID REFERENCES public.base_products(id) ON DELETE CASCADE,
  mockup_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  published_product_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_generated_mockups_job ON public.generated_mockups(job_id);
ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage generated_mockups" ON public.generated_mockups
  FOR ALL TO authenticated USING (is_admin_or_whitelisted()) WITH CHECK (is_admin_or_whitelisted());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('design-library', 'design-library', true),
  ('mockup-templates', 'mockup-templates', true),
  ('generated-mockups', 'generated-mockups', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins can write/manage, public can read
CREATE POLICY "Public read design-library" ON storage.objects
  FOR SELECT USING (bucket_id = 'design-library');
CREATE POLICY "Admins write design-library" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'design-library' AND is_admin_or_whitelisted());
CREATE POLICY "Admins update design-library" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'design-library' AND is_admin_or_whitelisted());
CREATE POLICY "Admins delete design-library" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'design-library' AND is_admin_or_whitelisted());

CREATE POLICY "Public read mockup-templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'mockup-templates');
CREATE POLICY "Admins write mockup-templates" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mockup-templates' AND is_admin_or_whitelisted());
CREATE POLICY "Admins update mockup-templates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'mockup-templates' AND is_admin_or_whitelisted());
CREATE POLICY "Admins delete mockup-templates" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'mockup-templates' AND is_admin_or_whitelisted());

CREATE POLICY "Public read generated-mockups" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-mockups');
CREATE POLICY "Admins write generated-mockups" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'generated-mockups' AND is_admin_or_whitelisted());
CREATE POLICY "Admins update generated-mockups" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'generated-mockups' AND is_admin_or_whitelisted());
CREATE POLICY "Admins delete generated-mockups" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'generated-mockups' AND is_admin_or_whitelisted());

-- Seed default categories
INSERT INTO public.design_categories (name, slug, sort_order) VALUES
  ('Sports', 'sports', 1),
  ('Humors', 'humors', 2),
  ('Mīlestība', 'milestiba', 3),
  ('Bērniem', 'berniem', 4),
  ('Latvija', 'latvija', 5),
  ('Citi', 'citi', 99);
