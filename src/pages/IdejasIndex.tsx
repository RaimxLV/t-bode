import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard, type ArticleCardPost } from "@/components/ideas/ArticleCard";
import { useContentCategories } from "@/hooks/useContentCategories";
import { Gift, PartyPopper, Printer, ArrowRight, Sparkles } from "lucide-react";

const ICONS: Record<string, typeof Printer> = { Printer, Gift, PartyPopper };

const IdejasIndex = () => {
  const { data: categories = [] } = useContentCategories();
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

  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Idejas un Padomi | T-Bode"
        description="Dāvanu idejas, personalizācijas padomi un skaidrojumi par drukas tehnoloģijām — DTF, DTG, sietspiedi un sublimāciju."
        canonical="/idejas"
        breadcrumbs={[
          { name: "Sākums", url: "/" },
          { name: "Idejas un Padomi", url: "/idejas" },
        ]}
      />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-card/40">
          <div className="container mx-auto px-4 pt-24 pb-12">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-body text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> T-Bode zināšanas
            </p>
            <h1 className="font-display text-4xl sm:text-6xl leading-[0.95] mb-4 max-w-3xl">
              Idejas un Padomi
            </h1>
            <p className="text-muted-foreground font-body text-lg max-w-2xl">
              Praktiski padomi par apdrukas tehnoloģijām un pārbaudītas dāvanu idejas.
              Bez tukšas runas — tikai tas, kas noder, pirms pasūti personalizētu apģērbu.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-3 gap-4">
            {categories.map((c) => {
              const Icon = ICONS[c.icon_key ?? ""] ?? Sparkles;
              return (
                <Link
                  key={c.id}
                  to={`/idejas/kategorija/${c.slug}`}
                  className="group bg-card border border-border rounded-xl p-6 hover:border-primary/60 transition-colors"
                >
                  <Icon className="w-7 h-7 text-primary mb-4" aria-hidden="true" />
                  <h2 className="font-display text-xl mb-2 group-hover:text-primary transition-colors">
                    {c.name_lv}
                  </h2>
                  {c.description_lv && (
                    <p className="text-sm text-muted-foreground font-body mb-4">{c.description_lv}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm font-body text-primary">
                    Skatīt rakstus <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <h2 className="font-display text-2xl sm:text-3xl mb-6">Jaunākie raksti</h2>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground font-body py-16 text-center">
              Pirmie raksti tiek sagatavoti — drīz būs lasāmi.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ArticleCard post={featured} categoryName={categoryName(featured.category_id)} featured />
              {rest.map((p) => (
                <ArticleCard key={p.id} post={p} categoryName={categoryName(p.category_id)} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default IdejasIndex;