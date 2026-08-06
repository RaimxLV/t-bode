UPDATE public.content_topics SET status = 'idea', used_post_id = NULL
WHERE used_post_id IN (SELECT id FROM public.blog_posts WHERE status = 'draft');

DELETE FROM public.blog_post_products
WHERE blog_post_id IN (SELECT id FROM public.blog_posts WHERE status = 'draft');

DELETE FROM public.blog_posts WHERE status = 'draft';