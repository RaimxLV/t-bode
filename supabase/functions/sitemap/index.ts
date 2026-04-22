// Public sitemap.xml generator. Returns XML listing static routes + all products.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://t-bode.lovable.app").replace(/\/$/, "");

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/collection", changefreq: "daily", priority: "0.9" },
  { path: "/design", changefreq: "weekly", priority: "0.9" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .order("updated_at", { ascending: false });

    const urls: string[] = [];
    for (const r of STATIC_ROUTES) {
      urls.push(
        `<url><loc>${SITE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
      );
    }
    for (const p of products ?? []) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : undefined;
      urls.push(
        `<url><loc>${SITE_URL}/product/${escapeXml(p.slug)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
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
