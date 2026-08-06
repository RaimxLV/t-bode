import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard, type ArticleCardPost } from "@/components/ideas/ArticleCard";
import { useContentCategories } from "@/hooks/useContentCategories";
import { ArrowLeft } from "lucide-react";

const IdejasCategory = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: categories = [], isLoading: catLoading } = useContentCategories();
  const category = categories.find((c) => c.slug === slug);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["ideas-posts", "category", category?.id],
    enabled: !!category?.id,
    queryFn: async (): Promise<ArticleCardPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at,reading_minutes,category_id")
        .eq("status", "published")
        .eq("category_id", category!.id)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data as ArticleCardPost[]) ?? [];
    },
  });

  if (!catLoading && !category) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Seo title="Kategorija nav atrasta | T-Bode" noindex />
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-32 pb-20 text-center">
          <h1 className="font-display text-3xl mb-3">Kategorija nav atrasta</h1>
          <Link to="/idejas" className="text-primary underline font-body">
            Uz Idejas un Padomi
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-paper-foreground flex flex-col">
      {category && (
        <Seo
          title={`${category.name_lv} | Idejas un Padomi | T-Bode`}
          description={category.description_lv || `${category.name_lv} — raksti un padomi no T-Bode.`}
          canonical={`/idejas/kategorija/${category.slug}`}
          breadcrumbs={[
            { name: "Sākums", url: "/" },
            { name: "Idejas un Padomi", url: "/idejas" },
            { name: category.name_lv, url: `/idejas/kategorija/${category.slug}` },
          ]}
        />
      )}
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 md:px-10 pt-24 pb-24">
        <Link
          to="/idejas"
          className="inline-flex items-center gap-1.5 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-foreground/50 hover:text-cta-red transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Idejas un Padomi
        </Link>
        <h1 className="font-display text-5xl sm:text-7xl uppercase leading-[0.85] mb-4">
          {category?.name_lv ?? ""}
        </h1>
        {category?.description_lv && (
          <p className="font-body font-light text-lg text-foreground/60 max-w-xl mb-14 border-b border-foreground/10 pb-10">
            {category.description_lv}
          </p>
        )}

        {isLoading || catLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="font-body text-foreground/50 py-24 text-center">
            Šajā kategorijā raksti vēl tiek sagatavoti.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
            {posts.map((p) => (
              <ArticleCard key={p.id} post={p} categoryName={category?.name_lv} variant="square" />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default IdejasCategory;