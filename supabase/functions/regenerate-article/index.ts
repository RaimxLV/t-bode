import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { generateArticle } from "../_shared/article-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Regenerates the text of one existing article (keeps slug, date and cover image). */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const key = Deno.env.get("LOVABLE_API_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key || !url || !serviceKey) throw new Error("AI vai datubāzes konfigurācija nav pieejama");

    const body = await req.json().catch(() => ({}));
    const postId = typeof body?.post_id === "string" ? body.post_id : "";
    const instruction = typeof body?.instruction === "string" ? body.instruction.slice(0, 800) : "";
    if (!postId) throw new Error("Nav norādīts raksta ID");

    const admin = createClient(url, serviceKey);
    const { data: post, error: postError } = await admin
      .from("blog_posts")
      .select("id,title,category_id,topic_id")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) throw new Error("Raksts nav atrasts");

    let topic: any = null;
    if (post.topic_id) {
      const { data } = await admin
        .from("content_topics")
        .select("title_lv,primary_keyword,secondary_keywords,angle_hint")
        .eq("id", post.topic_id)
        .maybeSingle();
      topic = data;
    }
    if (!topic) topic = { title_lv: post.title, primary_keyword: null, secondary_keywords: [], angle_hint: null };

    let categoryName = "Idejas";
    if (post.category_id) {
      const { data: cat } = await admin
        .from("content_categories").select("name_lv").eq("id", post.category_id).maybeSingle();
      if (cat?.name_lv) categoryName = cat.name_lv;
    }

    const article = await generateArticle(key, topic, categoryName, instruction);

    const { error: updateError } = await admin
      .from("blog_posts")
      .update({
        title: article.title,
        excerpt: article.excerpt ?? null,
        content: article.content,
        seo_title: article.seo_title ?? null,
        seo_description: article.seo_description ?? null,
        faq: Array.isArray(article.faq) ? article.faq : [],
        reading_minutes: readingMinutes(article.content),
        approved_at: null,
      })
      .eq("id", postId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, title: article.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("regenerate-article error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Nezināma kļūda" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});