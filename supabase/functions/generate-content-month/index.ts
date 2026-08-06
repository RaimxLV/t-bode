import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { generateArticle, isTopicInSeason } from "../_shared/article-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  year?: number;
  month?: number; // 1-12
  count?: number; // how many drafts to generate
  topic_ids?: string[]; // optional explicit topic selection
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Tuesdays + Thursdays of the month at 09:00 Riga time (~UTC+2/+3 → use 07:00 UTC). */
function publishSlots(year: number, month: number): string[] {
  const slots: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d, 7, 0, 0));
    const dow = date.getUTCDay();
    if (dow === 2 || dow === 4) slots.push(date.toISOString());
  }
  return slots;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body: Body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = body.year ?? now.getUTCFullYear();
    const month = body.month ?? now.getUTCMonth() + 1;
    const count = Math.min(Math.max(body.count ?? 8, 1), 10);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pick topics: explicit selection, else this month's planned topics first, then backlog.
    let topics: any[] = [];
    if (body.topic_ids?.length) {
      const { data } = await admin
        .from("content_topics")
        .select("*")
        .in("id", body.topic_ids.slice(0, 10));
      topics = data ?? [];
    } else {
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const { data: planned } = await admin
        .from("content_topics")
        .select("*")
        .eq("status", "idea")
        .eq("planned_month", monthStart)
        .order("priority")
        .limit(count);
      topics = planned ?? [];
      if (topics.length < count) {
        const { data: backlog } = await admin
          .from("content_topics")
          .select("*")
          .eq("status", "idea")
          .is("planned_month", null)
          .order("priority")
          .limit(count - topics.length);
        topics = [...topics, ...(backlog ?? [])];
      }
    }

    if (topics.length === 0) {
      return new Response(
        JSON.stringify({ error: "Tēmu bankā nav brīvu tēmu. Pievieno jaunas tēmas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reserve the selected topics before generation. This prevents repeated clicks
    // from generating the same topics while an earlier request is still running.
    const selectedIds = topics.map((topic) => topic.id);
    const { data: reserved, error: reserveError } = await admin
      .from("content_topics")
      .update({ status: "generating" })
      .in("id", selectedIds)
      .eq("status", "idea")
      .select("*");
    if (reserveError) throw reserveError;
    topics = reserved ?? [];
    if (topics.length === 0) {
      return new Response(JSON.stringify({ error: "Šīs tēmas jau tiek gatavotas. Uzgaidi un atjauno kalendāru." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cats } = await admin.from("content_categories").select("id, name_lv");
    const catName = new Map((cats ?? []).map((c: any) => [c.id, c.name_lv]));

    // Free publish slots for the month (skip dates already taken by scheduled posts).
    const slots = publishSlots(year, month);
    const { data: taken } = await admin
      .from("blog_posts")
      .select("scheduled_for")
      .gte("scheduled_for", `${year}-${String(month).padStart(2, "0")}-01`)
      .not("scheduled_for", "is", null);
    const takenDays = new Set(
      (taken ?? []).map((t: any) => new Date(t.scheduled_for).toISOString().slice(0, 10)),
    );
    const freeSlots = slots.filter((s) => !takenDays.has(s.slice(0, 10)));

    if (freeSlots.length === 0) {
      await admin.from("content_topics").update({ status: "idea" }).in("id", topics.map((topic) => topic.id));
      return new Response(JSON.stringify({ error: "Šis mēnesis jau ir pilnībā sagatavots — visi publicēšanas datumi ir aizņemti." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (topics.length > freeSlots.length) {
      const unused = topics.slice(freeSlots.length);
      await admin.from("content_topics").update({ status: "idea" }).in("id", unused.map((topic) => topic.id));
      topics = topics.slice(0, freeSlots.length);
    }

    const created: any[] = [];
    const failed: any[] = [];

    const processTopic = async (topic: any, i: number) => {
      try {
        const article = await generateArticle(
          LOVABLE_API_KEY,
          topic,
          catName.get(topic.category_id) ?? "Idejas",
        );
        const baseSlug = slugify(article.title);
        let slug = baseSlug;
        const { data: clash } = await admin
          .from("blog_posts").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${year}`;

        const { data: post, error } = await admin
          .from("blog_posts")
          .insert({
            title: article.title,
            slug,
            excerpt: article.excerpt ?? null,
            content: article.content,
            seo_title: article.seo_title ?? null,
            seo_description: article.seo_description ?? null,
            faq: Array.isArray(article.faq) ? article.faq : [],
            reading_minutes: readingMinutes(article.content),
            category_id: topic.category_id,
            topic_id: topic.id,
            status: "draft",
            scheduled_for: freeSlots[i] ?? null,
          })
          .select("id, title, slug, scheduled_for")
          .maybeSingle();
        if (error || !post) throw new Error(error?.message ?? "insert failed");

        await admin
          .from("content_topics")
          .update({ status: "drafted", used_post_id: post.id })
          .eq("id", topic.id);

        created.push(post);
      } catch (e) {
        console.error("article generation failed", topic.id, e);
        await admin.from("content_topics").update({ status: "idea" }).eq("id", topic.id);
        failed.push({ topic_id: topic.id, title: topic.title_lv, error: String(e) });
      }
    };

    // Generate in small parallel batches so the browser request finishes before
    // the edge timeout without creating a large burst of AI requests.
    for (let i = 0; i < topics.length; i += 3) {
      await Promise.all(topics.slice(i, i + 3).map((topic, offset) => processTopic(topic, i + offset)));
    }

    return new Response(JSON.stringify({ ok: true, created, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content-month error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});