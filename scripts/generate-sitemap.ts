// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Fetches all products from Supabase and writes public/sitemap.xml.

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://t-bode.lv";

// Read Supabase URL + anon key from .env (these are publishable, safe in source).
function loadEnv(): { url: string; key: string } {
  const envPath = resolve(".env");
  let url = process.env.VITE_SUPABASE_URL || "";
  let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if ((!url || !key) && existsSync(envPath)) {
    const text = readFileSync(envPath, "utf-8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
      if (!m) continue;
      if (m[1] === "VITE_SUPABASE_URL" && !url) url = m[2];
      if (m[1] === "VITE_SUPABASE_PUBLISHABLE_KEY" && !key) key = m[2];
    }
  }
  return { url, key };
}

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/collection", changefreq: "daily", priority: "0.9" },
  { path: "/design", changefreq: "weekly", priority: "0.9" },
  { path: "/install", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

async function fetchProducts(env: { url: string; key: string }): Promise<SitemapEntry[]> {
  if (!env.url || !env.key) {
    console.warn("[sitemap] Missing Supabase env — skipping product entries.");
    return [];
  }
  try {
    const res = await fetch(
      `${env.url}/rest/v1/products?select=slug,updated_at&status=eq.published&is_draft=eq.false&order=updated_at.desc`,
      {
        headers: {
          apikey: env.key,
          Authorization: `Bearer ${env.key}`,
        },
      },
    );
    if (!res.ok) {
      console.warn(`[sitemap] Supabase fetch failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/produkti/${r.slug}`,
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        changefreq: "weekly" as const,
        priority: "0.8",
      }));
  } catch (e: any) {
    console.warn(`[sitemap] Supabase fetch error: ${e?.message}`);
    return [];
  }
}

async function fetchBlogPosts(env: { url: string; key: string }): Promise<SitemapEntry[]> {
  if (!env.url || !env.key) return [];
  try {
    const res = await fetch(
      `${env.url}/rest/v1/blog_posts?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc`,
      { headers: { apikey: env.key, Authorization: `Bearer ${env.key}` } },
    );
    if (!res.ok) {
      console.warn(`[sitemap] blog_posts fetch failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string; published_at: string }>;
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/blog/${r.slug}`,
        lastmod: (r.updated_at || r.published_at)
          ? new Date(r.updated_at || r.published_at).toISOString()
          : undefined,
        changefreq: "weekly" as const,
        priority: "0.7",
      }));
  } catch (e: any) {
    console.warn(`[sitemap] blog_posts fetch error: ${e?.message}`);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const env = loadEnv();
  const [productEntries, blogEntries] = await Promise.all([
    fetchProducts(env),
    fetchBlogPosts(env),
  ]);
  const entries = [...staticEntries, ...productEntries, ...blogEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(
    `[sitemap] wrote public/sitemap.xml (${entries.length} URLs: ${staticEntries.length} static + ${productEntries.length} products + ${blogEntries.length} blog posts)`,
  );
})();