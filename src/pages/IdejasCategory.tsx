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
    <div className="min-h-screen bg-background flex flex-col">
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
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <Link
          to="/idejas"
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Idejas un Padomi
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl mb-3">{category?.name_lv ?? ""}</h1>
        {category?.description_lv && (
          <p className="text-muted-foreground font-body text-lg max-w-2xl mb-10">
            {category.description_lv}
          </p>
        )}

        {isLoading || catLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground font-body py-16 text-center">
            Šajā kategorijā raksti vēl tiek sagatavoti.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <ArticleCard key={p.id} post={p} categoryName={category?.name_lv} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default IdejasCategory;