import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { buildCanonical, shouldNoindex } from "@/lib/seoPolicy";

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "product" | "article";
  canonical?: string;
  /** Optional JSON-LD structured data */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Override og:locale; otherwise inferred from i18n */
  locale?: string;
  /** Optional breadcrumb trail rendered as BreadcrumbList JSON-LD. */
  breadcrumbs?: { name: string; url: string }[];
  /** When true, do NOT append the site name to <title>. */
  noTitleSuffix?: boolean;
  /** Optional keyword suffix inserted between page title and site name. */
  titleKeyword?: string;
  /** When true, instruct crawlers not to index this route. */
  noindex?: boolean;
  /** Loading placeholders must not announce a final analytics page title. */
  analyticsReady?: boolean;
}

const SITE_NAME = "T-Bode";
const SITE_URL = "https://t-bode.lv";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * Centralized SEO component. Renders <title>, meta description,
 * Open Graph / Twitter tags, canonical URL, html lang, and optional JSON-LD.
 */
export const Seo = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = "website",
  canonical,
  jsonLd,
  locale,
  breadcrumbs,
  noTitleSuffix,
  titleKeyword,
  noindex,
  analyticsReady = true,
}: SeoProps) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const lang = locale || i18n.language || "lv";
  const alreadyHasSite = !!title && title.toLowerCase().includes("t-bode");
  const fullTitle = !title
    ? SITE_NAME
    : noTitleSuffix || alreadyHasSite
      ? title
      : titleKeyword
        ? `${title} | ${titleKeyword} | ${SITE_NAME}`
        : `${title} | ${SITE_NAME}`;
  const url = buildCanonical(canonical || location.pathname);
  const excludeFromIndex = noindex || shouldNoindex(location.pathname, location.search);

  useEffect(() => {
    if (excludeFromIndex || !analyticsReady) return;
    document.documentElement.dataset.analyticsPath = location.pathname;
    document.documentElement.dataset.analyticsTitle = fullTitle;
    window.dispatchEvent(new Event("tbode:seo-ready"));
    return () => {
      if (document.documentElement.dataset.analyticsPath === location.pathname) {
        delete document.documentElement.dataset.analyticsPath;
        delete document.documentElement.dataset.analyticsTitle;
      }
    };
  }, [location.pathname, fullTitle, excludeFromIndex, analyticsReady]);

  const jsonLdArray: Record<string, any>[] = [];
  if (jsonLd) jsonLdArray.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));
  if (breadcrumbs && breadcrumbs.length > 0) {
    jsonLdArray.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: buildCanonical(b.url),
      })),
    });
  }

  // Remove static fallback tags from index.html so each page has exactly one
  // description / canonical / og / robots tag (Helmet does not dedupe them).
  useEffect(() => {
    document.head
      .querySelectorAll(
        'meta[name="description"]:not([data-rh]), meta[name="robots"]:not([data-rh]), meta[name="googlebot"]:not([data-rh]), meta[property^="og:"]:not([data-rh]), meta[name^="twitter:"]:not([data-rh]), link[rel="canonical"]:not([data-rh])',
      )
      .forEach((el) => el.remove());
  }, []);

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta
        name="robots"
        content={excludeFromIndex ? "noindex, follow" : "index, follow, max-snippet:-1, max-image-preview:large"}
      />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1024" />
      <meta property="og:image:height" content="1024" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "lv_LV"} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {jsonLdArray.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
};
