-- Hide blog posts from public until we're ready to launch publicly
DROP POLICY IF EXISTS "Published blog posts are public" ON public.blog_posts;

CREATE POLICY "Only admins and workers can view blog posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role) OR is_admin_or_whitelisted());