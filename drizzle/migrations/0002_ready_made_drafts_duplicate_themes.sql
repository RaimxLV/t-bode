ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at timestamptz;
COMMENT ON COLUMN public.products.published_at IS 'First time the product became publicly visible; never reset by later edits or unpublishing.';

CREATE OR REPLACE FUNCTION public.products_publication_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Keep draft flag and status in sync when only the draft flag is toggled.
    IF NEW.is_draft IS DISTINCT FROM OLD.is_draft AND NEW.status = OLD.status AND NEW.status <> 'archived' THEN
      NEW.status := CASE WHEN NEW.is_draft THEN 'draft'::product_status ELSE 'published'::product_status END;
    END IF;
    -- First publication date is immutable once set.
    IF OLD.published_at IS NOT NULL THEN
      NEW.published_at := OLD.published_at;
    ELSIF (OLD.is_draft OR OLD.status <> 'published') AND NOT NEW.is_draft AND NEW.status = 'published' THEN
      IF coalesce(btrim(NEW.name), '') = '' OR NEW.price IS NULL OR NEW.price <= 0 OR coalesce(btrim(NEW.slug), '') = '' THEN
        RAISE EXCEPTION 'Produktam pirms publicēšanas vajag nosaukumu, saiti un cenu';
      END IF;
      NEW.published_at := now();
    ELSE
      NEW.published_at := NULL;
    END IF;
  ELSE
    IF NEW.is_draft AND NEW.status = 'published' THEN NEW.status := 'draft'; END IF;
    IF NOT NEW.is_draft AND NEW.status = 'published' THEN
      NEW.published_at := now();
    ELSE
      NEW.published_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS products_publication_guard ON public.products;
CREATE TRIGGER products_publication_guard BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_publication_guard();

CREATE TABLE public.product_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_lv text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_themes TO authenticated;
GRANT ALL ON public.product_themes TO service_role;
ALTER TABLE public.product_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active themes" ON public.product_themes FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_or_whitelisted());
CREATE POLICY "Admins insert themes" ON public.product_themes FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_whitelisted());
CREATE POLICY "Admins update themes" ON public.product_themes FOR UPDATE TO authenticated USING (public.is_admin_or_whitelisted()) WITH CHECK (public.is_admin_or_whitelisted());
CREATE POLICY "Admins delete themes" ON public.product_themes FOR DELETE TO authenticated USING (public.is_admin_or_whitelisted());
CREATE TRIGGER update_product_themes_updated_at BEFORE UPDATE ON public.product_themes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_theme_assignments (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.product_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, theme_id)
);
CREATE INDEX product_theme_assignments_theme_idx ON public.product_theme_assignments(theme_id);
GRANT SELECT ON public.product_theme_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_theme_assignments TO authenticated;
GRANT ALL ON public.product_theme_assignments TO service_role;
ALTER TABLE public.product_theme_assignments ENABLE ROW LEVEL SECURITY;
-- Products RLS applies inside the subquery, so draft assignments stay hidden from the public.
CREATE POLICY "Public can view assignments of visible products" ON public.product_theme_assignments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));
CREATE POLICY "Admins insert assignments" ON public.product_theme_assignments FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_whitelisted());
CREATE POLICY "Admins delete assignments" ON public.product_theme_assignments FOR DELETE TO authenticated USING (public.is_admin_or_whitelisted());

CREATE OR REPLACE FUNCTION public.duplicate_product(_product_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  src public.products;
  base_slug text;
  new_slug text;
  n integer := 1;
  new_id uuid := gen_random_uuid();
  rec jsonb;
BEGIN
  IF NOT public.is_admin_or_whitelisted() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO src FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;

  base_slug := regexp_replace(src.slug, '-kopija(-[0-9]+)?$', '') || '-kopija';
  new_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = new_slug) LOOP
    n := n + 1;
    new_slug := base_slug || '-' || n;
  END LOOP;

  rec := to_jsonb(src) || jsonb_build_object(
    'id', new_id,
    'slug', new_slug,
    'name', src.name || ' (kopija)',
    'name_lv', CASE WHEN src.name_lv IS NULL THEN NULL ELSE src.name_lv || ' (kopija)' END,
    'is_draft', true,
    'status', 'draft',
    'published_at', NULL,
    'display_order', NULL,
    'created_at', now(),
    'updated_at', now()
  );
  INSERT INTO public.products SELECT * FROM jsonb_populate_record(NULL::public.products, rec);

  INSERT INTO public.product_theme_assignments (product_id, theme_id)
  SELECT new_id, theme_id FROM public.product_theme_assignments WHERE product_id = _product_id;

  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.duplicate_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_product(uuid) TO authenticated;