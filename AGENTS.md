# SEO maintenance

- Preserve the existing build-time sitemap generator and both public sitemap functions; synchronize their static routes and priorities when SEO rules change, so different entry points cannot restore obsolete settings.
- Keep SEO-only changes isolated from checkout, cart, payment, authentication and hero rendering, so search improvements do not alter customer ordering behavior.
- Centralize canonical normalization and technical-route/draft-preview indexing in `src/lib/seoPolicy.ts`; route SEO must react to location changes so private query state never becomes an indexed URL.
- Load the existing font stylesheet in the document head rather than a remote CSS import to start font discovery earlier without changing typography.
- Image transformation failures must retry the original image once, then a local placeholder, keeping the existing frame and stopping retry loops.
- Preserve the sitemap mechanisms but paginate public reads and use anonymous storefront visibility in their shared function reader; failed data reads must not overwrite the static sitemap with an incomplete result.
- Resolve only explicitly storage-verified legacy product image paths through the shared image resolver; preserve all unverified URLs and product records to avoid wrong variant photos.
- Emit manual analytics only after route SEO signals its resolved title; measure public pathname only and scrub referrer/query/hash defaults to avoid personal state leakage.
- Initialize offscreen maps only near the viewport and pause invisible gallery animation; reserve the same dimensions so deferred work does not change layout.
- Activate product-card carousels near the viewport and load only initial/neighboring slides; keep links and card frames unchanged to reduce synchronous catalogue initialization.
- Do not enable static homepage prerender on hosting that hardcodes index.html SPA fallback without a verified separate private/unknown shell; otherwise private and unknown URLs receive indexable homepage HTML.
- Key the product detail stateful view by product identity, not fetched object reference; new products reset selections/dialogs/quantity while same-product refetches retain customer choices.
- Treat a product URL color as a validated initial variant suggestion only, never as an ongoing override of customer selections; this preserves same-product refetch behavior.
- Keep the bag editorial draft in its own page/components with globally declared, locally consumed palette tokens; shared landing pages and production data must remain unaffected.
- Keep the authored bag studio isolated with page-ordered styles, shared controls, and CDN image pointers; this preserves the supplied composition without changing storefront behavior.
- Own the bag color selection at page level, validated against current product identity and variants, so all start links agree and refetches retain valid customer choices.
- Keep native bag print compositions and filtering in local modules with shared accessible dialogs and one-shot visibility-controlled CSS motion; inspiration must never import a design or trigger ordering.
- Keep the homepage process animation as the approved same-origin static document in public/how-it-works-animation.html behind an iframe wrapper that validates height messages by origin and contentWindow; edit it only mechanically, never redesign, and it must never invoke real storefront transactions.
