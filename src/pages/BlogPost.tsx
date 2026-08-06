import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { ArrowLeft, ArrowRight, Clock, List } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { readingMinutes, withHeadingAnchors } from "@/lib/articleContent";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArticleCard, type ArticleCardPost } from "@/components/ideas/ArticleCard";
import { Button } from "@/components/ui/button";

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

  const { html: contentHtml, toc } = useMemo(
    () => withHeadingAnchors(post?.content ? sanitizeHtml(post.content) : ""),
    [post?.content]
  );
  const minutes = post?.reading_minutes || readingMinutes(post?.content);
  const faq = Array.isArray(post?.faq) ? post!.faq!.filter((f) => f?.q && f?.a) : [];
  const canonicalUrl = post ? `https://t-bode.lv/idejas/${post.slug}` : "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
      <main className={`flex-1 max-w-3xl mx-auto px-4 sm:px-6 w-full ${isEmbeddedPreview ? "py-4 sm:py-5" : "pt-24 pb-16"}`}>
        {isPreview && !isEmbeddedPreview && (
          <div className="mb-4 rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-body text-primary">
            Priekšskatījuma režīms — ietver melnraksta produktus. Klientiem šis nav redzams.
          </div>
        )}
        {!isEmbeddedPreview && (
          <Link to="/idejas" className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Idejas un Padomi
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
            <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] uppercase tracking-wider font-body text-muted-foreground">
              {categoryName && categorySlug && (
                <Link to={`/idejas/kategorija/${categorySlug}`} className="text-primary hover:underline">
                  {categoryName}
                </Link>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" /> {minutes} min lasīšana
              </span>
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
            <h1 className="font-display text-3xl sm:text-5xl leading-[1.05] mb-4">{post.title}</h1>
            {post.excerpt && (
              <p className="text-lg font-body text-muted-foreground mb-8">{post.excerpt}</p>
            )}
            {post.cover_image_url && (
              <div className="w-full aspect-video rounded-xl mb-8 bg-muted flex items-center justify-center overflow-hidden border border-border">
                <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}
            {toc.length >= 3 && !isEmbeddedPreview && (
              <nav aria-label="Satura rādītājs" className="mb-8 rounded-xl border border-border bg-card p-5">
                <p className="inline-flex items-center gap-2 font-display text-sm uppercase tracking-wider mb-3">
                  <List className="w-4 h-4 text-primary" aria-hidden="true" /> Saturs
                </p>
                <ol className="space-y-1.5 font-body text-sm">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                      <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {contentHtml && (
              <div
                className="font-body text-[17px] text-foreground max-w-none scroll-smooth [&_h1]:text-3xl [&_h1]:font-display [&_h1]:mt-10 [&_h1]:mb-3 [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-display [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h3]:text-xl [&_h3]:font-display [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:leading-[1.75] [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-4 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_img]:rounded-xl [&_img]:my-6 [&_table]:w-full [&_table]:my-6 [&_table]:text-sm [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-card [&_th]:p-2.5 [&_th]:text-left [&_th]:font-display [&_td]:border [&_td]:border-border [&_td]:p-2.5 [&_td]:align-top"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}

            {faq.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="font-display text-2xl mb-4">Biežāk uzdotie jautājumi</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="font-body text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="font-body text-muted-foreground leading-relaxed">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {products.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="font-display text-2xl mb-4">Šī raksta dizaini</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>
              </section>
            )}

            {!isEmbeddedPreview && (
              <section className="mt-12 rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="font-display text-2xl mb-2">Uzzīmē savu ideju uz krekla</h2>
                <p className="text-muted-foreground font-body mb-5">
                  Personalizācijas konstruktorā vari salikt tekstu, bildi vai dizainu un uzreiz redzēt rezultātu.
                </p>
                <Button asChild size="lg">
                  <Link to="/design">
                    Sākt personalizēt <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
                  </Link>
                </Button>
              </section>
            )}

            {related.length > 0 && !isEmbeddedPreview && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="font-display text-2xl mb-6">Saistītie raksti</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {related.map((r) => (
                    <ArticleCard key={r.id} post={r} categoryName={categoryName ?? undefined} />
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