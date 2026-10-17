# SEO maintenance

- Preserve the existing build-time sitemap generator and both public sitemap functions; synchronize their static routes and priorities when SEO rules change, so different entry points cannot restore obsolete settings.
- Keep SEO-only changes isolated from checkout, cart, payment, authentication and hero rendering, so search improvements do not alter customer ordering behavior.