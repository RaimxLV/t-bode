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
      .select("id, order_id, quantity, zakeke_design_id, zakeke_order_id, zakeke_order_item_id, zakeke_print_files, zakeke_visitor_code, created_at, orders:order_id(status, payment_method, manually_paid_at, created_at, order_number)")
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
      const rowDesign = row.zakeke_design_id ? String(row.zakeke_design_id) : null;
      const cachedDesigns = arr
        .map((x: any) => x?.designId ?? x?.designID ?? x?.design_id ?? null)
        .filter(Boolean)
        .map(String);
      const cacheMismatchesDesign = rowDesign && cachedDesigns.length > 0 && !cachedDesigns.includes(rowDesign);
      if (cacheMismatchesDesign) {
        return true;
      }
      // Treat "ZIP-only" results as still pending so we can replace them
      // with individual print/mockup files once Zakeke exposes them.
      const hasIndividual = arr.some((x: any) => {
        const url = String(x?.url ?? x?.fileUrl ?? "");
        const isZip = /\.zip(\?|$)/i.test(url) || x?.type === "zip" || x?.side === "production-zip";
        return !isZip;
      });
      if (!hasIndividual) return true;
      // Keep polling for ~2 hours so additional sides/mockups (Back, etc.)
      // that Zakeke produces a few minutes after the Front PNG also land.
      const createdAt = row.orders?.created_at ?? row.created_at;
      if (createdAt) {
        const ageMs = Date.now() - new Date(createdAt).getTime();
        if (ageMs < 2 * 60 * 60 * 1000) return true;
      }
      return false;
    }).slice(0, MAX_ITEMS_PER_RUN);

    let attached = 0;
    let stillPending = 0;
    let failed = 0;

    for (const row of targets) {
      try {
        let files: Awaited<ReturnType<typeof getZakekeOrderItemFiles>> = [];
        const rowDesign = row.zakeke_design_id ? String(row.zakeke_design_id) : null;
        const filterForRowDesign = (candidateFiles: any[]) => {
          if (!rowDesign) return candidateFiles;
          const tagged = candidateFiles.filter((f) => f?.designId ?? f?.designID ?? f?.design_id);
          if (tagged.length === 0) return candidateFiles;
          return tagged.filter((f) => String(f?.designId ?? f?.designID ?? f?.design_id) === rowDesign);
        };
        if (row.zakeke_order_item_id) {
          try {
            files = await getZakekeOrderItemFiles(row.zakeke_order_item_id);
          } catch (e) {
            const msg = (e as Error).message;
            // 404 = files still being generated, retry next cron tick.
            if (/\b404\b/.test(msg)) {
              console.log("zakeke-files-sync: files not ready yet", row.id);
              stillPending++;
              continue;
            }
            throw e;
          }
        } else if (row.zakeke_order_id) {
          const all = await getZakekeOrderOutputFiles(row.zakeke_order_id);
          files = filterForRowDesign(all);
        }
        if (files.length === 0 && row.zakeke_design_id && !row.zakeke_order_item_id) {
          // Create order on the fly so Zakeke starts producing print files.
          try {
            // Use the same human-readable code as zakeke-create-order so the
            // Zakeke admin UI shows "TB-0218" instead of a raw UUID pair.
            const orderNumber = (row as any).orders?.order_number;
            const baseCode = orderNumber != null
              ? String(orderNumber).padStart(4, "0")
              : String(row.order_id).slice(0, 8).toUpperCase();
            const externalCode = `TB-${baseCode}-${String(row.id).slice(0, 8)}`;
            const { zakekeOrderId, orderItemIds } = await createZakekeOrder({
              externalOrderId: externalCode,
              customerCode: String(row.order_id),
              visitorCode: row.zakeke_visitor_code ?? null,
              items: [{ designId: String(row.zakeke_design_id), quantity: row.quantity ?? 1, reference: row.id }],
            });
            await service.from("order_items").update({
              zakeke_order_id: zakekeOrderId,
              zakeke_order_item_id: orderItemIds[0] ?? null,
            }).eq("id", row.id);
            // Zakeke needs a minute to generate the print files. If the
            // immediate fetch fails (404 "not ready yet"), leave the row
            // empty so the NEXT sync run picks it up with the stored ids —
            // don't poison the slot with a fallback ZIP.
            try {
              if (orderItemIds[0]) files = await getZakekeOrderItemFiles(orderItemIds[0]);
              else files = await getZakekeOrderOutputFiles(zakekeOrderId);
            } catch (e) {
              console.log("zakeke-files-sync: files not ready yet for new order", row.id, (e as Error).message);
              files = [];
            }
          } catch (e) {
            console.error("zakeke-files-sync: createZakekeOrder failed", row.id, (e as Error).message);
            files = [];
          }
        }

        if (files.length > 0) {
          files = filterForRowDesign(files);
          const hasIndividual = files.some(
            (f) => !/\.zip(\?|$)/i.test(f.url) && f.side !== "production-zip",
          );
          const finalFiles = hasIndividual
            ? files.filter(
                (f) => !/\.zip(\?|$)/i.test(f.url) && f.side !== "production-zip",
              )
            : files;
          // Only overwrite if we now have MORE files than before — otherwise
          // a transient short response from Zakeke could shrink the set.
          const existing = Array.isArray(row.zakeke_print_files)
            ? row.zakeke_print_files
            : (row.zakeke_print_files && typeof row.zakeke_print_files === "object"
                ? Object.values(row.zakeke_print_files)
                : []);
          const existingDesigns = (existing as any[])
            .map((x: any) => x?.designId ?? x?.designID ?? x?.design_id ?? null)
            .filter(Boolean)
            .map(String);
          const existingMismatchesDesign = !!rowDesign && existingDesigns.length > 0 && !existingDesigns.includes(rowDesign);
          if (existingMismatchesDesign || finalFiles.length >= (existing as any[]).length) {
            await service.from("order_items").update({ zakeke_print_files: finalFiles }).eq("id", row.id);
            attached++;
          } else {
            stillPending++;
          }
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