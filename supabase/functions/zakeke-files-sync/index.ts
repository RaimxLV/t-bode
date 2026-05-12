// Background job — polls Zakeke for ready print files and attaches them to
// order_items where files are still missing. Triggered by pg_cron every 5 min.
// Idempotent and safe to call repeatedly. Skips items that already have files.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  createZakekeOrder,
  getZakekeDesignZipFile,
  getZakekeOrderItemFiles,
  getZakekeOrderOutputFiles,
} from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Look back 14 days only — older orders are unlikely to need backfill.
const LOOKBACK_DAYS = 14;
const MAX_ITEMS_PER_RUN = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find candidate items: have a Zakeke design but no print files yet,
    // belong to a paid order (not pending / cancelled).
    const { data: candidates, error: candErr } = await service
      .from("order_items")
      .select("id, order_id, quantity, zakeke_design_id, zakeke_order_id, zakeke_order_item_id, zakeke_print_files, zakeke_visitor_code, created_at, orders:order_id(status, payment_method, manually_paid_at, created_at)")
      .gte("created_at", since)
      .not("zakeke_design_id", "is", null)
      .limit(200);
    if (candErr) throw candErr;

    const isReadyForProduction = (o: any) =>
      o && (
        ["confirmed", "processing", "shipped", "delivered", "paid"].includes(o.status)
        || !!o.manually_paid_at
      );

    const targets = (candidates ?? []).filter((row: any) => {
      if (!isReadyForProduction(row.orders)) return false;
      const f = row.zakeke_print_files;
      const arr: any[] = Array.isArray(f)
        ? f
        : (f && typeof f === "object" ? Object.values(f) : []);
      if (arr.length === 0) return true;
      // Treat "ZIP-only" results as still pending so we can replace them
      // with individual print/mockup files once Zakeke exposes them.
      const hasIndividual = arr.some((x: any) => {
        const url = String(x?.url ?? x?.fileUrl ?? "");
        const isZip = /\.zip(\?|$)/i.test(url) || x?.type === "zip" || x?.side === "production-zip";
        return !isZip;
      });
      return !hasIndividual;
    }).slice(0, MAX_ITEMS_PER_RUN);

    let attached = 0;
    let stillPending = 0;
    let failed = 0;

    for (const row of targets) {
      try {
        let files: Awaited<ReturnType<typeof getZakekeOrderItemFiles>> = [];
        if (row.zakeke_order_item_id) {
          files = await getZakekeOrderItemFiles(row.zakeke_order_item_id);
        } else if (row.zakeke_order_id) {
          files = await getZakekeOrderOutputFiles(row.zakeke_order_id);
        } else if (row.zakeke_design_id) {
          // Create order on the fly so Zakeke starts producing print files.
          try {
            const { zakekeOrderId, orderItemIds } = await createZakekeOrder({
              externalOrderId: `${row.order_id}:${row.id}`,
              customerCode: String(row.order_id),
              visitorCode: row.zakeke_visitor_code ?? null,
              items: [{ designId: String(row.zakeke_design_id), quantity: row.quantity ?? 1, reference: row.id }],
            });
            await service.from("order_items").update({
              zakeke_order_id: zakekeOrderId,
              zakeke_order_item_id: orderItemIds[0] ?? null,
            }).eq("id", row.id);
            if (orderItemIds[0]) files = await getZakekeOrderItemFiles(orderItemIds[0]);
            else files = await getZakekeOrderOutputFiles(zakekeOrderId);
          } catch {
            const z = await getZakekeDesignZipFile(String(row.zakeke_design_id));
            files = z ? [z] : [];
          }
        }

        if (files.length > 0) {
          await service.from("order_items").update({ zakeke_print_files: files }).eq("id", row.id);
          attached++;
        } else {
          stillPending++;
        }
      } catch (e) {
        failed++;
        console.error("zakeke-files-sync item", row.id, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({
      scanned: targets.length,
      attached,
      still_pending: stillPending,
      failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("zakeke-files-sync error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});