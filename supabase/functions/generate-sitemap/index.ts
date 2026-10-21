// Dynamic sitemap.xml generator (named per SEO spec).
// Returns published products + published blog posts + static routes as XML.
import { readPublicSitemapRows } from "../_shared/public-sitemap.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://t-bode.lv").replace(/\/$/, "");

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/collection", changefreq: "daily", priority: "0.5" },
  { path: "/design", changefreq: "weekly", priority: "1.0" },
  { path: "/veikali", changefreq: "monthly", priority: "0.3" },
  { path: "/idejas", changefreq: "weekly", priority: "0.8" },
  { path: "/kas-ir-dtf", changefreq: "monthly", priority: "0.8" },
  { path: "/auduma-maisinu-apdruka", changefreq: "monthly", priority: "0.8" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { products, posts, categories } = await readPublicSitemapRows();

    const urls: string[] = [];
    for (const r of STATIC_ROUTES) {
      urls.push(
        `<url><loc>${SITE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
      );
    }
    for (const p of products ?? []) {
      urls.push(
        `<url><loc>${SITE_URL}/produkti/${escapeXml(p.slug)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
      );
    }
    for (const category of categories) {
      urls.push(
        `<url><loc>${SITE_URL}/idejas/kategorija/${escapeXml(category.slug)}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
      );
    }
    for (const b of posts ?? []) {
      urls.push(
        `<url><loc>${SITE_URL}/idejas/${escapeXml(b.slug)}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    return new Response(`<!-- error: ${e.message} -->`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});