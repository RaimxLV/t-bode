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
}

const SITE_NAME = "T-Bode";
const DEFAULT_IMAGE = "https://t-bode.lovable.app/og-image.jpg";
const SITE_URL = "https://t-bode.lovable.app";

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
}: SeoProps) => {
  const { i18n } = useTranslation();
  const lang = locale || i18n.language || "lv";
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = canonical || (typeof window !== "undefined" ? window.location.href : SITE_URL);

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
      <meta property="og:locale" content={lang === "en" ? "en_US" : "lv_LV"} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
