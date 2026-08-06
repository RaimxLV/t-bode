GRANT SELECT ON public.content_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_categories TO authenticated;
GRANT ALL ON public.content_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_topics TO authenticated;
GRANT ALL ON public.content_topics TO service_role;