import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

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
}

const SITE_NAME = "T-Bode";
const SITE_URL = "https://www.t-bode.lv";
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
}: SeoProps) => {
  const { i18n } = useTranslation();
  const lang = locale || i18n.language || "lv";
  const alreadyHasSite = !!title && title.toLowerCase().includes("t-bode");
  const fullTitle = !title
    ? SITE_NAME
    : noTitleSuffix || alreadyHasSite
      ? title
      : titleKeyword
        ? `${title} | ${titleKeyword} | ${SITE_NAME}`
        : `${title} | ${SITE_NAME}`;
  const url = canonical || (typeof window !== "undefined" ? window.location.href : SITE_URL);

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
        item: b.url,
      })),
    });
  }

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />

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
