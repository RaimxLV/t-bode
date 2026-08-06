import { Link } from "react-router-dom";

export type ArticleCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  reading_minutes: number | null;
  category_id: string | null;
};

/** Editorial card sizes used across the magazine-style grid. */
export type ArticleCardVariant = "lead" | "portrait" | "square";

type Props = {
  post: ArticleCardPost;
  categoryName?: string;
  variant?: ArticleCardVariant;
  showExcerpt?: boolean;
};

const RATIO: Record<ArticleCardVariant, string> = {
  lead: "aspect-[16/9]",
  portrait: "aspect-[3/4]",
  square: "aspect-square",
};

const TITLE: Record<ArticleCardVariant, string> = {
  lead: "text-4xl sm:text-5xl md:text-6xl",
  portrait: "text-2xl sm:text-3xl",
  square: "text-2xl sm:text-3xl",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("lv-LV", { year: "numeric", month: "long", day: "numeric" });

export const ArticleCard = ({
  post,
  categoryName,
  variant = "square",
  showExcerpt = true,
}: Props) => (
  <Link to={`/idejas/${post.slug}`} className="group block">
    <div className={`overflow-hidden bg-paper-muted mb-6 ${RATIO[variant]}`}>
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          loading={variant === "lead" ? "eager" : "lazy"}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-paper-muted to-paper" />
      )}
    </div>

    <div className="flex items-center gap-3 mb-3 text-[10px] uppercase tracking-[0.2em] font-body font-bold text-foreground/40">
      {categoryName && <span>{categoryName}</span>}
      {categoryName && post.published_at && (
        <span className="w-1 h-1 rounded-full bg-cta-red" aria-hidden="true" />
      )}
      {post.published_at && <span>{formatDate(post.published_at)}</span>}
    </div>

    <h3
      className={`font-display leading-none mb-4 transition-colors group-hover:text-cta-red ${TITLE[variant]}`}
    >
      {post.title}
    </h3>

    {showExcerpt && post.excerpt && (
      <p
        className={`font-body font-light text-foreground/60 ${
          variant === "lead" ? "text-lg leading-relaxed max-w-2xl" : "text-sm line-clamp-2"
        }`}
      >
        {post.excerpt}
      </p>
    )}

    {variant === "lead" && (
      <span className="mt-6 inline-block border-b border-foreground pb-1 text-xs font-body font-bold uppercase tracking-[0.2em] transition-colors group-hover:border-cta-red group-hover:text-cta-red">
        Lasīt rakstu
      </span>
    )}
  </Link>
);