import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArticleCard, type ArticleCardPost } from "@/components/ideas/ArticleCard";
import { HeroCtaButton } from "@/components/HeroCtaButton";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  campaign_id: string | null;
  published_at: string | null;
  status: string;
  category_id: string | null;
  reading_minutes: number | null;
  faq: { q: string; a: string }[] | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at?: string | null;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { loading: authLoading, user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [related, setRelated] = useState<ArticleCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const isEmbeddedPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    if (!slug) return;
    if (isPreview && authLoading) return;

    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!p) { setPost(null); setLoading(false); return; }
      setPost(p as any);

      // Category + related articles from the same pillar
      if ((p as any).category_id) {
        const [{ data: cat }, { data: rel }] = await Promise.all([
          supabase
            .from("content_categories")
            .select("name_lv,slug")
            .eq("id", (p as any).category_id)
            .maybeSingle(),
          supabase
            .from("blog_posts")
            .select("id,title,slug,excerpt,cover_image_url,published_at,reading_minutes,category_id")
            .eq("status", "published")
            .eq("category_id", (p as any).category_id)
            .neq("id", (p as any).id)
            .order("published_at", { ascending: false })
            .limit(3),
        ]);
        setCategoryName((cat as any)?.name_lv ?? null);
        setCategorySlug((cat as any)?.slug ?? null);
        setRelated(((rel as any) ?? []) as ArticleCardPost[]);
      } else {
        setCategoryName(null);
        setCategorySlug(null);
        setRelated([]);
      }

      // Linked products (manual + auto)
      const { data: links } = await supabase
        .from("blog_post_products" as any)
        .select("product_id, sort_order")
        .eq("blog_post_id", (p as any).id)
        .order("sort_order");
      const linkedIds = (links || []).map((l: any) => l.product_id);

      let autoIds: string[] = [];
      if ((p as any).campaign_id) {
        const { data: byCampaign } = await supabase
          .from("products")
          .select("id")
          .eq("campaign_id", (p as any).campaign_id);
        autoIds = (byCampaign || []).map((r: any) => r.id);
      }

      const allIds = Array.from(new Set([...linkedIds, ...autoIds]));
      if (allIds.length === 0) { setProducts([]); setLoading(false); return; }

      let q = supabase.from("products").select("*").in("id", allIds);
      if (!isPreview) q = q.eq("is_draft", false);
      const { data: prods } = await q;
      // preserve manual order then auto
      const order = new Map<string, number>();
      linkedIds.forEach((id, i) => order.set(id, i));
      const sorted = (prods || []).sort((a, b) => {
        const ai = order.has(a.id) ? order.get(a.id)! : 1000;
        const bi = order.has(b.id) ? order.get(b.id)! : 1000;
        return ai - bi;
      });
      setProducts(sorted);
      setLoading(false);
    })();
  }, [slug, isPreview, authLoading, user?.id]);

  const contentHtml = useMemo(
    () => (post?.content ? sanitizeHtml(post.content) : ""),
    [post?.content]
  );
  const faq = Array.isArray(post?.faq) ? post!.faq!.filter((f) => f?.q && f?.a) : [];
  const canonicalUrl = post ? `https://t-bode.lv/idejas/${post.slug}` : "";

  return (
    <div className="min-h-screen bg-paper text-paper-foreground flex flex-col">
      {!isEmbeddedPreview && <Navbar />}
      {post && !isEmbeddedPreview && (
        <Seo
          title={post.seo_title || post.title}
          description={post.seo_description || post.excerpt || post.title}
          image={post.cover_image_url || undefined}
          type="article"
          canonical={canonicalUrl}
          breadcrumbs={[
            { name: "Sākums", url: "/" },
            { name: "Idejas un Padomi", url: "/idejas" },
            ...(categoryName && categorySlug
              ? [{ name: categoryName, url: `/idejas/kategorija/${categorySlug}` }]
              : []),
            { name: post.title, url: `/idejas/${post.slug}` },
          ]}
          jsonLd={[
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: post.excerpt || undefined,
              image: post.cover_image_url ? [post.cover_image_url] : undefined,
              datePublished: post.published_at || undefined,
              dateModified: post.updated_at || post.published_at || undefined,
              articleSection: categoryName || undefined,
              inLanguage: "lv",
              mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
              author: { "@type": "Organization", name: "T-Bode" },
              publisher: {
                "@type": "Organization",
                name: "T-Bode",
                logo: { "@type": "ImageObject", url: "https://t-bode.lv/og-image.jpg" },
              },
            },
            ...(faq.length > 0
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: faq.map((f) => ({
                      "@type": "Question",
                      name: f.q,
                      acceptedAnswer: { "@type": "Answer", text: f.a },
                    })),
                  },
                ]
              : []),
          ]}
        />
      )}
      <main className={`flex-1 max-w-3xl mx-auto px-5 sm:px-6 w-full ${isEmbeddedPreview ? "py-4 sm:py-5" : "pt-24 pb-20"}`}>
        {isPreview && !isEmbeddedPreview && (
          <div className="mb-4 rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-body text-primary">
            Priekšskatījuma režīms — ietver melnraksta produktus. Klientiem šis nav redzams.
          </div>
        )}
        {!isEmbeddedPreview && (
          <Link
            to="/idejas"
            className="inline-flex items-center gap-1.5 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-foreground/50 hover:text-cta-red transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Idejas un Padomi
          </Link>
        )}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : !post ? (
          <div className="text-center py-20">
            <h1 className="font-display text-2xl mb-2">Raksts nav atrasts</h1>
            <Link to="/idejas" className="text-primary underline">Uz Idejas un Padomi</Link>
          </div>
        ) : (
          <article>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] uppercase tracking-[0.2em] font-body font-bold text-foreground/40">
              {categoryName && categorySlug && (
                <Link to={`/idejas/kategorija/${categorySlug}`} className="hover:text-cta-red transition-colors">
                  {categoryName}
                </Link>
              )}
              {categoryName && post.published_at && (
                <span className="w-1 h-1 rounded-full bg-cta-red" aria-hidden="true" />
              )}
              {post.published_at && (
                <span>
                  {new Date(post.published_at).toLocaleDateString("lv-LV", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl sm:text-6xl uppercase leading-[0.9] mb-5">{post.title}</h1>
            {post.excerpt && (
              <p className="text-lg sm:text-xl font-body font-light leading-relaxed text-foreground/60 mb-10 pb-10 border-b border-foreground/10">
                {post.excerpt}
              </p>
            )}
            {post.cover_image_url && (
              <div className="w-full aspect-[16/9] mb-10 bg-paper-muted overflow-hidden">
                <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}
            {contentHtml && (
              <div
                className="font-body text-[18px] font-light text-foreground/85 max-w-none scroll-smooth [&_h1]:font-display [&_h1]:text-3xl [&_h1]:uppercase [&_h1]:mt-14 [&_h1]:mb-4 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:sm:text-4xl [&_h2]:uppercase [&_h2]:leading-[0.95] [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:scroll-mt-24 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:scroll-mt-24 [&_p]:my-5 [&_p]:leading-[1.8] [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-cta-red [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:my-6 [&_ul]:space-y-3 [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.7em] [&_ul>li]:before:w-2 [&_ul>li]:before:h-[2px] [&_ul>li]:before:bg-cta-red [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-6 [&_ol]:space-y-3 [&_li]:leading-[1.8] [&_blockquote]:my-10 [&_blockquote]:border-l-0 [&_blockquote]:pl-0 [&_blockquote]:font-display [&_blockquote]:text-2xl [&_blockquote]:sm:text-3xl [&_blockquote]:leading-tight [&_blockquote]:text-foreground [&_blockquote]:not-italic [&_img]:my-8 [&_table]:w-full [&_table]:my-8 [&_table]:text-sm [&_table]:border-collapse [&_th]:border-b [&_th]:border-foreground/20 [&_th]:p-3 [&_th]:text-left [&_th]:font-display [&_th]:uppercase [&_td]:border-b [&_td]:border-foreground/10 [&_td]:p-3 [&_td]:align-top"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}

            {faq.length > 0 && (
              <section className="mt-16 pt-10 border-t border-foreground/10">
                <h2 className="font-display text-3xl uppercase mb-6">Biežāk uzdotie jautājumi</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-foreground/10">
                      <AccordionTrigger className="font-body text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="font-body font-light text-foreground/65 leading-relaxed">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {products.length > 0 && (
              <section className="mt-16 pt-10 border-t border-foreground/10">
                <h2 className="font-display text-3xl uppercase mb-6">Šī raksta dizaini</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>
              </section>
            )}

            {!isEmbeddedPreview && (
              <section className="mt-16 border-t-2 border-foreground pt-10">
                <h2 className="font-display text-3xl sm:text-4xl uppercase leading-[0.95] mb-3">
                  Uzzīmē savu ideju uz krekla
                </h2>
                <p className="font-body font-light text-foreground/60 mb-6 max-w-md">
                  Personalizācijas konstruktorā vari salikt tekstu, bildi vai dizainu un uzreiz redzēt rezultātu.
                </p>
                <HeroCtaButton to="/design" label="Sākt personalizēt" />
              </section>
            )}

            {related.length > 0 && !isEmbeddedPreview && (
              <section className="mt-16 pt-10 border-t border-foreground/10">
                <h2 className="font-display text-3xl uppercase mb-8">Saistītie raksti</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {related.map((r) => (
                    <ArticleCard
                      key={r.id}
                      post={r}
                      categoryName={categoryName ?? undefined}
                      variant="square"
                      showExcerpt={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>
      {!isEmbeddedPreview && <Footer />}
    </div>
  );
};

export default BlogPost;