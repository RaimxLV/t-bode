import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const y = now.getUTCFullYear();
  const d = new Date(Date.UTC(y, month - 1, day));
  return d < now ? new Date(Date.UTC(y + 1, month - 1, day)) : d;
}
function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: require CRON_SECRET header
  const provided = req.headers.get("x-cron-secret") ?? "";
  const expected = Deno.env.get("CRON_SECRET") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const actions: any[] = [];

  // 1. Auto-start campaigns for upcoming holidays
  const { data: holidays } = await admin.from("holidays").select("*").eq("is_active", true);
  const { data: existingCampaigns } = await admin.from("campaigns").select("id, holiday_id, year, status, auto_advance");

  for (const h of holidays ?? []) {
    const next = nextOccurrence(h.month, h.day);
    const days = daysUntil(next);
    if (days > h.lead_days) continue;
    const exists = (existingCampaigns ?? []).some(
      (c: any) => c.holiday_id === h.id && c.year === next.getUTCFullYear(),
    );
    if (exists) continue;
    const placeholder = `${h.name_lv} ${next.getUTCFullYear()}`;
    const { data: ins, error } = await admin.from("campaigns").insert({
      holiday_id: h.id,
      year: next.getUTCFullYear(),
      status: "generating",
      title: placeholder,
      auto_advance: true,
      auto_started_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    if (error) { actions.push({ step: "create_campaign", holiday: h.name_lv, error: error.message }); continue; }
    actions.push({ step: "create_campaign", holiday: h.name_lv, id: ins?.id });
    // Kick off brief generation
    if (ins?.id) {
      const r = await fetch(`${url}/functions/v1/generate-campaign-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ campaign_id: ins.id }),
      });
      actions.push({ step: "generate_brief", id: ins.id, ok: r.ok });
    }
  }

  // Reload campaigns with the freshly created ones
  const { data: camps } = await admin
    .from("campaigns")
    .select("id, status, auto_advance");

  // 2. Advance ready_for_review → generate designs
  for (const c of camps ?? []) {
    if (!c.auto_advance) continue;
    if (c.status !== "ready_for_review") continue;
    const r = await fetch(`${url}/functions/v1/generate-campaign-designs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ campaign_id: c.id }),
    });
    actions.push({ step: "generate_designs", id: c.id, ok: r.ok });
  }

  // 3. Advance designs_ready → auto-star first two designs + blog
  for (const c of camps ?? []) {
    if (!c.auto_advance) continue;
    if (c.status !== "designs_ready") continue;
    const { data: designs } = await admin
      .from("campaign_designs")
      .select("id, is_primary, image_url")
      .eq("campaign_id", c.id)
      .not("image_url", "is", null)
      .order("created_at");
    const already = (designs ?? []).filter((d: any) => d.is_primary);
    if (already.length === 0 && (designs?.length ?? 0) > 0) {
      const toStar = (designs ?? []).slice(0, 2).map((d: any) => d.id);
      if (toStar.length) {
        await admin.from("campaign_designs").update({ is_primary: true }).in("id", toStar);
        actions.push({ step: "auto_star", id: c.id, count: toStar.length });
      }
    }
    const r = await fetch(`${url}/functions/v1/generate-campaign-blog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ campaign_id: c.id }),
    });
    actions.push({ step: "generate_blog", id: c.id, ok: r.ok });
  }

  // 4. Stop before product publishing — that needs admin to pick bases.

  // 5. Auto-archive campaigns 3 days after the holiday date has passed.
  //    - campaign.status -> 'archived'
  //    - products tied to the campaign -> status 'archived' + hidden from collection
  //    - blog posts are left untouched (long-term SEO)
  const ARCHIVE_GRACE_DAYS = 3;
  const { data: activeCamps } = await admin
    .from("campaigns")
    .select("id, holiday_id, year, status")
    .not("status", "in", "(archived,failed)");

  const holidayById = new Map((holidays ?? []).map((h: any) => [h.id, h]));

  for (const c of activeCamps ?? []) {
    const h: any = holidayById.get(c.holiday_id);
    if (!h) continue;
    const holidayDate = new Date(Date.UTC(c.year, h.month - 1, h.day));
    const archiveAfter = new Date(holidayDate.getTime() + ARCHIVE_GRACE_DAYS * 86400000);
    if (Date.now() < archiveAfter.getTime()) continue;

    // Archive products linked to this campaign (by campaign_id, with holiday_id fallback)
    const { data: prodsByCampaign, error: pErr } = await admin
      .from("products")
      .update({ status: "archived", show_in_collection: false })
      .eq("campaign_id", c.id)
      .select("id");
    if (pErr) actions.push({ step: "archive_products", id: c.id, error: pErr.message });
    else actions.push({ step: "archive_products", id: c.id, count: (prodsByCampaign ?? []).length });

    // Fallback: products tagged with the holiday for this same year window but missing campaign_id
    if (c.holiday_id) {
      const yearStart = new Date(Date.UTC(c.year, 0, 1)).toISOString();
      const yearEnd = new Date(Date.UTC(c.year + 1, 0, 1)).toISOString();
      const { data: prodsByHoliday } = await admin
        .from("products")
        .update({ status: "archived", show_in_collection: false })
        .eq("holiday_id", c.holiday_id)
        .is("campaign_id", null)
        .gte("created_at", yearStart)
        .lt("created_at", yearEnd)
        .neq("status", "archived")
        .select("id");
      if ((prodsByHoliday ?? []).length) {
        actions.push({ step: "archive_products_by_holiday", id: c.id, count: prodsByHoliday!.length });
      }
    }

    // Archive the campaign itself
    const { error: cErr } = await admin
      .from("campaigns")
      .update({ status: "archived" })
      .eq("id", c.id);
    if (cErr) actions.push({ step: "archive_campaign", id: c.id, error: cErr.message });
    else actions.push({ step: "archive_campaign", id: c.id });
  }

  return new Response(JSON.stringify({ ok: true, actions }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});