
-- Create categories table with hierarchy support
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
TO public
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed top-level categories
INSERT INTO public.categories (name, slug, sort_order, icon_key) VALUES
  ('T-krekli', 't-shirts', 1, 't-shirts'),
  ('Hūdiji', 'hoodies', 2, 'hoodies'),
  ('Krūzes', 'mugs', 3, 'mugs'),
  ('Somas', 'bags', 4, 'bags'),
  ('Bērniem', 'kids', 5, 'kids'),
  ('Latvijas kolekcija', 'latvia', 6, 'latvia'),
  ('Aksesuāri', 'accessories', 7, 'accessories');

-- Seed subcategories under Latvia
INSERT INTO public.categories (name, slug, parent_id, sort_order, icon_key)
SELECT 'Līgo', 'latvia-ligo', id, 1, 'latvia'
FROM public.categories WHERE slug = 'latvia';

INSERT INTO public.categories (name, slug, parent_id, sort_order, icon_key)
SELECT 'Latvija', 'latvia-general', id, 2, 'latvia'
FROM public.categories WHERE slug = 'latvia';
