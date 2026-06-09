import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { ArrowLeft } from "lucide-react";

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
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!p) { setPost(null); setLoading(false); return; }
      setPost(p as any);

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
  }, [slug, isPreview]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      {post && (
        <Seo
          title={post.title}
          description={post.excerpt || post.title}
          image={post.cover_image_url || undefined}
          type="article"
          canonical={`https://www.t-bode.lv/blog/${post.slug}`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt || undefined,
            image: post.cover_image_url ? [post.cover_image_url] : undefined,
            datePublished: post.published_at || undefined,
            dateModified: post.published_at || undefined,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://www.t-bode.lv/blog/${post.slug}`,
            },
            author: { "@type": "Organization", name: "T-Bode" },
            publisher: {
              "@type": "Organization",
              name: "T-Bode",
              logo: {
                "@type": "ImageObject",
                url: "https://www.t-bode.lv/og-image.jpg",
              },
            },
          }}
        />
      )}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {isPreview && (
          <div className="mb-4 rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-body text-primary">
            Priekšskatījuma režīms — ietver melnraksta produktus. Klientiem šis nav redzams.
          </div>
        )}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Atpakaļ
        </Link>
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
            <Link to="/" className="text-primary underline">Atpakaļ uz sākumu</Link>
          </div>
        ) : (
          <article>
            {post.cover_image_url && (
              <div className="w-full aspect-video rounded-lg mb-6 bg-muted flex items-center justify-center overflow-hidden">
                <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-contain" />
              </div>
            )}
            <h1 className="font-display text-3xl sm:text-4xl mb-3">{post.title}</h1>
            {post.published_at && (
              <p className="text-xs text-muted-foreground font-body mb-6">
                {new Date(post.published_at).toLocaleDateString("lv-LV", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            {post.excerpt && (
              <p className="text-lg font-body text-muted-foreground mb-6">{post.excerpt}</p>
            )}
            {post.content && (
              <div
                className="font-body text-foreground max-w-none [&_h1]:text-3xl [&_h1]:font-display [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-display [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-display [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-2 [&_p]:leading-relaxed [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}

            {products.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="font-display text-2xl mb-4">Šī raksta dizaini</h2>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  Pieejami ierobežotu laiku — paspēj iegādāties pirms svētkiem.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;