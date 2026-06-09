import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

const BlogIndex = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setPosts((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Blogs | T-Bode"
        description="T-Bode raksti, iedvesma un jaunumi par apdrukātiem krekliem un dāvanām."
        canonical="/blog"
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <h1 className="font-display text-4xl sm:text-5xl mb-2">Blogs</h1>
        <p className="text-muted-foreground font-body mb-8">
          Iedvesma, idejas un jaunumi no T-Bode.
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground font-body py-16 text-center">
            Pagaidām nav publicētu rakstu.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
              >
                {p.cover_image_url && (
                  <div className="aspect-[16/10] bg-muted overflow-hidden">
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-display text-xl mb-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="text-sm text-muted-foreground font-body line-clamp-3">
                      {p.excerpt}
                    </p>
                  )}
                  {p.published_at && (
                    <p className="text-xs text-muted-foreground/70 font-body mt-3">
                      {new Date(p.published_at).toLocaleDateString("lv-LV")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogIndex;