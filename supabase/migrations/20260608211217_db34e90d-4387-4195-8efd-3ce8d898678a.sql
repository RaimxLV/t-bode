GRANT SELECT ON public.blog_posts TO anon;
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (status = 'published');