CREATE TABLE public.print_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width_cm numeric NOT NULL CHECK (width_cm > 0),
  height_cm numeric NOT NULL CHECK (height_cm > 0),
  dpi integer NOT NULL DEFAULT 460 CHECK (dpi > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage print presets" ON public.print_presets
  FOR ALL TO authenticated
  USING (public.is_admin_or_whitelisted())
  WITH CHECK (public.is_admin_or_whitelisted());

CREATE POLICY "Anyone reads active print presets" ON public.print_presets
  FOR SELECT USING (is_active = true);

CREATE TRIGGER print_presets_updated_at
  BEFORE UPDATE ON public.print_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.print_presets (name, width_cm, height_cm, dpi, sort_order) VALUES
  ('A4 vertikāli (21×29.7)', 21.0, 29.7, 460, 1),
  ('A4 horizontāli (29.7×21)', 29.7, 21.0, 460, 2),
  ('A3 vertikāli (29.7×42)', 29.7, 42.0, 460, 3);