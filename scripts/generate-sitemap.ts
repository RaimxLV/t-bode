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
  { path: "/collection", changefreq: "daily", priority: "0.5" },
  { path: "/design", changefreq: "weekly", priority: "1.0" },
  { path: "/veikali", changefreq: "monthly", priority: "0.3" },
  { path: "/idejas", changefreq: "weekly", priority: "0.8" },
  { path: "/kas-ir-dtf", changefreq: "monthly", priority: "0.8" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
];

// Read public rows in pages: the REST API can cap a single response at 1000.
async function fetchPublicRows<T>(env: { url: string; key: string }, query: string): Promise<T[]> {
  if (!env.url || !env.key) throw new Error("Missing sitemap configuration; keeping existing sitemap.");
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${env.url}/rest/v1/${query}&limit=1000&offset=${offset}`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
    });
    if (!res.ok) throw new Error(`Public sitemap data request failed (${res.status}); keeping existing sitemap.`);
    const page = await res.json() as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function fetchProducts(env: { url: string; key: string }): Promise<SitemapEntry[]> {
    const rows = await fetchPublicRows<{ slug: string; updated_at: string }>(env,
      "products?select=slug,updated_at&status=eq.published&is_draft=eq.false&order=slug.asc");
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/produkti/${r.slug}`,
        // updated_at changes on every row update, not just significant page edits.
        changefreq: "weekly" as const,
        priority: "0.6",
      }));
}

async function fetchBlogPosts(env: { url: string; key: string }): Promise<SitemapEntry[]> {
    const rows = await fetchPublicRows<{ slug: string; updated_at: string; published_at: string }>(env,
      "blog_posts?select=slug,updated_at,published_at&status=eq.published&order=slug.asc");
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/idejas/${r.slug}`,
        // No verified significant-content timestamp: omit lastmod.
        changefreq: "weekly" as const,
        priority: "0.5",
      }));
}

async function fetchCategories(env: { url: string; key: string }): Promise<SitemapEntry[]> {
  const rows = await fetchPublicRows<{ slug: string }>(env,
    "content_categories?select=slug&is_active=eq.true&order=slug.asc");
  return rows.filter((row) => row.slug).map((row) => ({
    path: `/idejas/kategorija/${row.slug}`, changefreq: "weekly", priority: "0.5",
  }));
}

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character] ?? character));

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${escapeXml(BASE_URL + e.path)}</loc>`,
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
  const [productEntries, blogEntries, categoryEntries] = await Promise.all([
    fetchProducts(env),
    fetchBlogPosts(env),
    fetchCategories(env),
  ]);
  const entries = [...staticEntries, ...productEntries, ...blogEntries, ...categoryEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(
    `[sitemap] wrote public/sitemap.xml (${entries.length} URLs: ${staticEntries.length} static + ${productEntries.length} products + ${blogEntries.length} blog posts)`,
  );
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Sitemap generation failed; keeping existing sitemap.");
  process.exitCode = 1;
});