import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Camera, CheckCircle2, Sparkles, Truck, Palette, Clock, Check } from "lucide-react";
import { HeroCtaButton } from "@/components/HeroCtaButton";
import { useCollectionProducts, useDesignProducts, getProductName } from "@/hooks/useProducts";
import { useCategories, getCategorySlugsIncludingChildren } from "@/hooks/useCategories";
import { useTranslation } from "react-i18next";

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
  /** Optional stat tiles shown under the hero */
  stats?: { value: string; label: string }[];
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
  stats,
  published = false,
}: SeoLandingPageProps) => {
  const { i18n } = useTranslation();
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

      <main className="relative">
        {/* HERO — full-bleed dramatic intro */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Background layers — deep midnight with a focused red glow */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(0 0% 4%) 0%, hsl(220 25% 7%) 60%, hsl(0 0% 3%) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 500px at 85% 10%, hsl(0 72% 45% / 0.35), transparent 60%), radial-gradient(700px 400px at 10% 90%, hsl(20 90% 50% / 0.18), transparent 65%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
              backgroundSize: "3px 3px",
            }}
          />

          <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 md:pt-36 md:pb-28 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/90 mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {kicker || "T-Bode personalizācija"}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]"
            >
              {h1 || title}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-8 max-w-2xl space-y-4 text-base md:text-lg text-white/85 leading-relaxed"
            >
              {intro.slice(0, 1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center"
            >
              <HeroCtaButton to={ctaHref} label={ctaText} />
              <Link
                to="/collection"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/40 bg-black/20 backdrop-blur px-6 py-4 font-body font-bold uppercase tracking-wide text-white hover:bg-white/10 hover:border-white/70 transition-all"
              >
                Gatavie dizaini
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {(stats && stats.length > 0
                ? stats
                : [
                    { value: "1 gab.", label: "Bez min. pasūtījuma" },
                    { value: "2–4 d.", label: "Izgatavošana Rīgā" },
                    { value: "50+", label: "Mazgāšanas reižu" },
                    { value: "4", label: "Veikali Rīgā" },
                  ]
              ).map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-4 py-4 text-white"
                >
                  <div className="font-display text-2xl md:text-3xl">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-white/70 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* INTRO BODY */}
        {intro.length > 1 && (
          <section className="container mx-auto px-4 py-16 max-w-3xl">
            <div className="space-y-5 text-base md:text-lg text-foreground/85 leading-relaxed">
              {intro.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* BENEFITS / BULLETS */}
        {bullets && bullets.length > 0 && (
          <section className="container mx-auto px-4 pb-16 max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                Kāpēc T-Bode
              </div>
              <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
                Kvalitāte, kas izturēs
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bullets.map((b, i) => {
                const icons = [Palette, CheckCircle2, Sparkles, Clock, Truck, Camera];
                const Icon = icons[i % icons.length];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
                  >
                    <div
                      aria-hidden
                      className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                    <div className="relative">
                      <div
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4"
                        style={{ background: "var(--gradient-brand)" }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                        {b}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* PRODUCTS */}
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                Mūsu maisiņš
              </div>
              <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
                Izvēlies savu krāsu
              </h2>
            </div>
            <Link
              to="/collection"
              className="text-sm font-semibold uppercase tracking-wider text-primary hover:underline inline-flex items-center gap-2"
            >
              Skatīt gatavos dizainus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
          ) : filtered.length === 1 ? (
            <FeaturedProduct
              product={filtered[0]}
              lang={i18n.language}
              ctaHref={ctaHref}
              ctaText={ctaText}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* SECONDARY CONTENT — editorial split */}
        {secondaryHeading && (
          <section className="bg-muted/30 border-y border-border">
            <div className="container mx-auto px-4 py-16 max-w-6xl grid md:grid-cols-12 gap-10 items-start">
              <div className="md:col-span-5">
                <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                  Pielietojums
                </div>
                <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
                  {secondaryHeading}
                </h2>
              </div>
              <div className="md:col-span-7 space-y-5 text-foreground/85 leading-relaxed text-base md:text-lg">
                {secondaryParagraphs?.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* GALLERY PLACEHOLDER */}
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
            Galerija
          </div>
          <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight mb-8">
            Reālu darbu paraugi
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider"
              >
                <Camera className="w-6 h-6 opacity-40" />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Drīzumā — pievienosim reālu pasūtījumu foto galeriju.
          </p>
        </section>

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <section className="container mx-auto px-4 py-16 max-w-4xl">
            <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              FAQ
            </div>
            <h2 className="font-display text-3xl md:text-5xl uppercase mb-8 leading-tight">
              Biežāk uzdotie jautājumi
            </h2>
            <div className="divide-y divide-border border-y border-border">
              {faq.map((f, i) => (
                <details key={i} className="group py-5">
                  <summary className="cursor-pointer list-none flex justify-between items-start gap-6">
                    <span className="flex items-start gap-4 font-semibold text-base md:text-lg">
                      <span className="text-primary font-display text-xl tabular-nums w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{f.q}</span>
                    </span>
                    <span className="text-primary text-2xl leading-none mt-1 group-open:rotate-45 transition-transform shrink-0">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 ml-12 text-muted-foreground leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* FINAL CTA — dramatic band */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0" style={{ background: "var(--gradient-brand)" }} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(800px 400px at 20% 110%, hsl(0 0% 0% / 0.5), transparent 60%), linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.4))",
            }}
          />
          <div className="relative container mx-auto px-4 py-20 md:py-28 max-w-3xl text-center text-white">
            <h2 className="font-display text-4xl md:text-6xl uppercase mb-4 leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]">
              Tavs maisiņš, tavs dizains
            </h2>
            <p className="text-white/85 mb-8 text-base md:text-lg max-w-xl mx-auto">
              Dažās minūtēs tiešsaistē. Bez minimālā pasūtījuma, ar piegādi visā Latvijā.
            </p>
            <div className="flex justify-center">
              <HeroCtaButton to={ctaHref} label={ctaText} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SeoLandingPage;

// --- Featured single product with interactive color swatches ---
function FeaturedProduct({
  product: p,
  lang,
  ctaHref,
  ctaText,
}: {
  product: any;
  lang: string;
  ctaHref: string;
  ctaText: string;
}) {
  const variants = p.color_variants || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const active = variants[activeIdx];
  const heroImg =
    active?.images?.[0] || p.image_url || p.gallery_images?.[0];
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center rounded-2xl overflow-hidden border border-border bg-card">
      <div className="relative aspect-square md:aspect-[4/5] bg-muted/40">
        {heroImg ? (
          <img
            key={heroImg}
            src={heroImg}
            alt={`${getProductName(p, lang)}${active?.name ? ` — ${active.name}` : ""}`}
            className="w-full h-full object-contain p-6 md:p-10 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Camera className="w-10 h-10 opacity-40" />
          </div>
        )}
      </div>
      <div className="p-6 md:p-10 lg:pr-14 space-y-6">
        <div className="space-y-2">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">
            100 % kokvilna · 38 × 42 cm
          </div>
          <h3 className="font-display text-3xl md:text-4xl uppercase leading-tight">
            {getProductName(p, lang)}
          </h3>
          <div className="text-2xl font-display text-primary">
            no {Number(p.price).toFixed(2).replace(".", ",")} €
          </div>
        </div>

        {variants.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Krāsa: <span className="text-foreground font-semibold normal-case tracking-normal">{active?.name}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {variants.map((cv: any, i: number) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`flex flex-col items-center gap-1.5 group focus:outline-none`}
                    aria-pressed={isActive}
                    aria-label={cv.name}
                    title={cv.name}
                  >
                    <span
                      className={`w-10 h-10 rounded-full border-2 transition-all shadow ${
                        isActive
                          ? "border-primary ring-2 ring-primary/50 scale-110"
                          : "border-border ring-2 ring-transparent group-hover:ring-primary/40"
                      }`}
                      style={{ backgroundColor: cv.hex }}
                    />
                    <span
                      className={`text-[10px] uppercase tracking-wide ${
                        isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {cv.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ul className="space-y-2 text-sm text-foreground/85">
          {[
            "Augšupielādē savu dizainu vai logo",
            "DTF apdruka — neizbalē mazgājot",
            "Bez minimālā pasūtījuma",
          ].map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2">
          <Link
            to={ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary px-6 py-3 font-body font-bold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}