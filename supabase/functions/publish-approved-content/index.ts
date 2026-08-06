import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireServiceRole } from "../_shared/service-role-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Publishes approved, scheduled articles whose slot has arrived.
 * Only posts that a human approved (approved_at set) are ever published.
 * Intended to run once a day via cron.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = requireServiceRole(req, corsHeaders);
  if (!guard.ok) return guard.response;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const { data: due } = await admin
      .from("blog_posts")
      .select("id, slug, title, topic_id")
      .eq("status", "draft")
      .not("approved_at", "is", null)
      .not("scheduled_for", "is", null)
      .lte("scheduled_for", nowIso)
      .order("scheduled_for")
      .limit(5);

    const published: any[] = [];
    for (const post of due ?? []) {
      const { error } = await admin
        .from("blog_posts")
        .update({ status: "published", published_at: nowIso })
        .eq("id", post.id)
        .eq("status", "draft");
      if (error) {
        console.error("publish failed", post.id, error.message);
        continue;
      }
      if (post.topic_id) {
        await admin.from("content_topics").update({ status: "published" }).eq("id", post.topic_id);
      }
      published.push({ id: post.id, slug: post.slug, title: post.title });
    }

    console.log(`publish-approved-content: published ${published.length}`);
    return new Response(JSON.stringify({ ok: true, published }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-approved-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});