import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollectionProducts, useDesignProducts } from "@/hooks/useProducts";
import { useCategories, getCategorySlugsIncludingChildren } from "@/hooks/useCategories";

export interface SeoLandingFAQ {
  q: string;
  a: string;
}

export interface SeoLandingPageProps {
  /** URL path, e.g. "/auduma-maisinu-apdruka" */
  path: string;
  /** <title> + H1 fallback */
  title: string;
  /** Optional separate H1 (otherwise uses title) */
  h1?: string;
  /** <meta description> */
  metaDescription: string;
  /** Hero kicker / breadcrumb-style label above H1 */
  kicker?: string;
  /** Intro paragraphs (rendered as <p>) — main SEO body */
  intro: string[];
  /** Optional bullet-list of benefits / features */
  bullets?: string[];
  /** DB category slug to filter products by (t-shirts, mugs, bags, hoodies, kids, accessories) */
  categorySlug: string;
  /** Source: "collection" (ready-made) or "design" (customizable) */
  productSource?: "collection" | "design";
  /** Max products to show */
  productLimit?: number;
  /** FAQ entries — also rendered as FAQPage JSON-LD */
  faq?: SeoLandingFAQ[];
  /** Primary CTA button text */
  ctaText?: string;
  /** Where CTA links to */
  ctaHref?: string;
  /** Secondary text below intro section */
  secondaryHeading?: string;
  secondaryParagraphs?: string[];
  /**
   * When false (default) the page renders with noindex and shows a
   * small "draft" banner. Flip to true when ready to publish to Google.
   */
  published?: boolean;
}

/**
 * Reusable SEO landing page. One file = one URL targeting one Google
 * search term, with unique content + filtered products + FAQ schema.
 */
export const SeoLandingPage = ({
  path,
  title,
  h1,
  metaDescription,
  kicker,
  intro,
  bullets,
  categorySlug,
  productSource = "collection",
  productLimit = 8,
  faq,
  ctaText = "Sāc dizainēt",
  ctaHref = "/design",
  secondaryHeading,
  secondaryParagraphs,
  published = false,
}: SeoLandingPageProps) => {
  const collection = useCollectionProducts();
  const design = useDesignProducts();
  const { data: cats = [] } = useCategories();

  const { data: products = [], isLoading } =
    productSource === "design" ? design : collection;

  const filtered = useMemo(() => {
    const matchSlugs = getCategorySlugsIncludingChildren(cats, categorySlug);
    return products
      .filter((p) => matchSlugs.includes(p.category))
      .slice(0, productLimit);
  }, [products, cats, categorySlug, productLimit]);

  const canonical = `https://t-bode.lv${path}`;

  const jsonLd: Record<string, any>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: h1 || title,
      description: metaDescription,
      provider: { "@type": "Organization", name: "T-Bode", url: "https://t-bode.lv" },
      areaServed: "LV",
      url: canonical,
    },
  ];
  if (faq && faq.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={title}
        description={metaDescription}
        canonical={canonical}
        type="website"
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: "Sākums", url: "https://t-bode.lv/" },
          { name: h1 || title, url: canonical },
        ]}
        noindex={!published}
      />
      <Navbar />

      {!published && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/40 text-yellow-200 text-center text-xs py-2 px-4">
          Šī lapa ir melnraksts — nav indeksējama Google un nav publiski saistīta. Pieejama tikai pa tiešu URL.
        </div>
      )}

      <main className="pt-16">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-12 pb-8 max-w-4xl">
          {kicker && (
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">
              {kicker}
            </div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-display text-4xl md:text-6xl uppercase leading-tight mb-6"
          >
            {h1 || title}
          </motion.h1>
          <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {bullets && bullets.length > 0 && (
            <ul className="mt-8 grid sm:grid-cols-2 gap-3">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-card border border-border rounded-lg p-4"
                >
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={ctaHref}>
                {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/collection">Skatīt gatavos dizainus</Link>
            </Button>
          </div>
        </section>

        {/* Products */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="font-display text-2xl md:text-3xl uppercase mb-6">
            Mūsu produkti
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">
              Pašlaik nav pieejamu produktu šajā kategorijā.{" "}
              <Link to="/design" className="text-primary underline">
                Skatīt visus dizainējamos produktus
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Secondary content */}
        {secondaryHeading && (
          <section className="container mx-auto px-4 py-8 max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl uppercase mb-4">
              {secondaryHeading}
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {secondaryParagraphs?.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <section className="container mx-auto px-4 py-12 max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl uppercase mb-6">
              Biežāk uzdotie jautājumi
            </h2>
            <div className="space-y-4">
              {faq.map((f, i) => (
                <details
                  key={i}
                  className="group bg-card border border-border rounded-lg p-4"
                >
                  <summary className="cursor-pointer font-semibold text-base list-none flex justify-between items-center">
                    {f.q}
                    <span className="text-primary group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <h2 className="font-display text-3xl md:text-5xl uppercase mb-4">
            Gatavs sākt?
          </h2>
          <p className="text-muted-foreground mb-6">
            Izveido savu unikālo dizainu dažās minūtēs. Bez minimālā pasūtījuma.
          </p>
          <Button asChild size="lg">
            <Link to={ctaHref}>
              {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SeoLandingPage;