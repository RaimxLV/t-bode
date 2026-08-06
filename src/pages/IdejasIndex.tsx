import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard, type ArticleCardPost } from "@/components/ideas/ArticleCard";
import { useContentCategories } from "@/hooks/useContentCategories";

const IdejasIndex = () => {
  const { data: categories = [] } = useContentCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["ideas-posts"],
    queryFn: async (): Promise<ArticleCardPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at,reading_minutes,category_id")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as ArticleCardPost[]) ?? [];
    },
  });

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name_lv;

  const visible = activeCategory ? posts.filter((p) => p.category_id === activeCategory) : posts;
  const [featured, ...rest] = visible;

  return (
    <div className="min-h-screen bg-paper text-paper-foreground flex flex-col">
      <Seo
        title="Idejas un Padomi — ceļveži personalizētam apģērbam | T-Bode"
        description="Praktiski ceļveži un dāvanu idejas: kā plānot merch komandai, klasei vai pasākumam un kā kopt apdrukātu apģērbu."
        canonical="/idejas"
        breadcrumbs={[
          { name: "Sākums", url: "/" },
          { name: "Idejas un Padomi", url: "/idejas" },
        ]}
      />
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl w-full mx-auto px-5 md:px-10 pt-24 pb-24">
          <header className="mb-14 md:mb-16 border-b border-foreground/10 pb-10 md:pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <h1 className="font-display text-6xl sm:text-7xl md:text-8xl leading-[0.8] uppercase tracking-tight">
                  Idejas un <br />
                  <span className="text-cta-red">Padomi</span>
                </h1>
                <p className="mt-6 font-body font-light text-lg text-foreground/60 max-w-md">
                  Ceļveži un idejas personalizētam apģērbam — kā saplānot, ko izvēlēties un kā to saglabāt kārtīgu.
                </p>
              </div>

              <nav
                aria-label="Rakstu kategorijas"
                className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-body uppercase tracking-[0.2em] font-bold"
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={
                    activeCategory === null
                      ? "text-cta-red border-b-2 border-cta-red pb-0.5"
                      : "text-foreground/60 hover:text-cta-red transition-colors pb-0.5"
                  }
                >
                  Visi raksti
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className={
                      activeCategory === c.id
                        ? "text-cta-red border-b-2 border-cta-red pb-0.5"
                        : "text-foreground/60 hover:text-cta-red transition-colors pb-0.5"
                    }
                  >
                    {c.name_lv}
                  </button>
                ))}
              </nav>
            </div>
          </header>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">
              <Skeleton className="md:col-span-8 aspect-[16/9]" />
              <Skeleton className="md:col-span-4 aspect-[3/4]" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="md:col-span-4 aspect-square" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="font-body text-foreground/50 py-24 text-center">
              Pirmie raksti tiek sagatavoti — drīz būs lasāmi.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
              <div className="md:col-span-8">
                <ArticleCard
                  post={featured}
                  categoryName={categoryName(featured.category_id)}
                  variant="lead"
                />
              </div>
              {rest.map((p, i) => (
                <div key={p.id} className={i === 0 ? "md:col-span-4" : "md:col-span-4"}>
                  <ArticleCard
                    post={p}
                    categoryName={categoryName(p.category_id)}
                    variant={i === 0 ? "portrait" : "square"}
                    showExcerpt={i === 0}
                  />
                </div>
              ))}
            </div>
          )}

          {categories.length > 0 && (
            <div className="mt-24 pt-10 border-t border-foreground/10 flex flex-wrap justify-center gap-x-8 gap-y-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/idejas/kategorija/${c.slug}`}
                  className="font-body text-xs uppercase tracking-[0.2em] text-foreground/50 hover:text-cta-red transition-colors"
                >
                  {c.name_lv}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IdejasIndex;