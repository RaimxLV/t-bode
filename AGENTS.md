# SEO maintenance

- Preserve the existing build-time sitemap generator and both public sitemap functions; synchronize their static routes and priorities when SEO rules change, so different entry points cannot restore obsolete settings.
- Keep SEO-only changes isolated from checkout, cart, payment, authentication and hero rendering, so search improvements do not alter customer ordering behavior.
- Centralize canonical normalization and technical-route/draft-preview indexing in `src/lib/seoPolicy.ts`; route SEO must react to location changes so private query state never becomes an indexed URL.
- Load the existing font stylesheet in the document head rather than a remote CSS import to start font discovery earlier without changing typography.
- Image transformation failures must retry the original image once, then a local placeholder, keeping the existing frame and stopping retry loops.
- Preserve the sitemap mechanisms but paginate public reads and use anonymous storefront visibility in their shared function reader; failed data reads must not overwrite the static sitemap with an incomplete result.