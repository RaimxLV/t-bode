import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/** Use the same anonymous visibility as storefront loaders, including always_available. */
export async function readPublicSitemapRows() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Sitemap configuration unavailable");
  const client = createClient(url, key, { auth: { persistSession: false } });

  async function readAll<T>(table: string, columns: string, filters: Record<string, string | boolean>): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = client.from(table).select(columns).order("slug").range(offset, offset + 999);
      for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
      const { data, error } = await query;
      if (error) throw new Error("Public sitemap data unavailable");
      const page = (data ?? []) as unknown as T[];
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  const [products, posts, categories] = await Promise.all([
    readAll<{ slug: string; updated_at: string }>("products", "slug,updated_at", { status: "published", is_draft: false }),
    readAll<{ slug: string; updated_at: string; published_at: string }>("blog_posts", "slug,updated_at,published_at", { status: "published" }),
    readAll<{ slug: string }>("content_categories", "slug", { is_active: true }),
  ]);
  return { products, posts, categories };
}