import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

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

type Props = {
  post: ArticleCardPost;
  categoryName?: string;
  featured?: boolean;
};

export const ArticleCard = ({ post, categoryName, featured = false }: Props) => (
  <Link
    to={`/idejas/${post.slug}`}
    className={`group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/60 transition-colors ${
      featured ? "sm:flex-row sm:col-span-2 lg:col-span-3" : ""
    }`}
  >
    <div
      className={`bg-muted overflow-hidden ${
        featured ? "sm:w-1/2 aspect-[16/10] sm:aspect-auto" : "aspect-[16/10]"
      }`}
    >
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-muted to-card" />
      )}
    </div>
    <div className={`p-5 flex flex-col flex-1 ${featured ? "sm:p-8 sm:justify-center" : ""}`}>
      <div className="flex items-center gap-3 mb-2 text-[11px] uppercase tracking-wider font-body text-muted-foreground">
        {categoryName && <span className="text-primary">{categoryName}</span>}
        {post.reading_minutes ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {post.reading_minutes} min
          </span>
        ) : null}
      </div>
      <h3
        className={`font-display leading-tight mb-2 group-hover:text-primary transition-colors ${
          featured ? "text-2xl sm:text-3xl" : "text-xl"
        }`}
      >
        {post.title}
      </h3>
      {post.excerpt && (
        <p className={`text-sm text-muted-foreground font-body ${featured ? "line-clamp-4" : "line-clamp-3"}`}>
          {post.excerpt}
        </p>
      )}
      {post.published_at && (
        <p className="text-xs text-muted-foreground/70 font-body mt-3">
          {new Date(post.published_at).toLocaleDateString("lv-LV", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  </Link>
);