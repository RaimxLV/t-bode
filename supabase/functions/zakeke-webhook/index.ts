import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  getZakekeOrderItemFiles,
  getZakekeOrderOutputFiles,
} from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zakeke-signature",
};

/**
 * Zakeke "Order Status Update" webhook receiver.
 *
 * Configure in Zakeke portal → Settings → Integrations → Webhooks →
 * Order status update URL = https://nkqwhiqrljwvzrivhqyh.supabase.co/functions/v1/zakeke-webhook
 *
 * Optional shared secret (header `X-Zakeke-Signature`) is validated against
 * the `ZAKEKE_WEBHOOK_SECRET` env var when set.
 *
 * On every notification we:
 *   1. Look up our order_item by `zakeke_order_id` or `zakeke_order_item_id`
 *   2. Pull the latest production files from Zakeke
 *   3. Cache them in `order_items.zakeke_print_files`
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const expected = (Deno.env.get("ZAKEKE_WEBHOOK_SECRET") ?? "").trim();
    if (expected) {
      const got = req.headers.get("x-zakeke-signature") ?? "";
      if (got !== expected) {
        console.warn("zakeke-webhook: bad signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({} as any));
    console.log("zakeke-webhook payload:", JSON.stringify(body).slice(0, 1000));

    // Zakeke "OrderGenerated" payload nests data under `data`
    const data = body?.data ?? body ?? {};
    const zakekeOrderId =
      data?.orderID ?? data?.orderId ?? data?.id ?? null;
    const orderCode: string | null = data?.orderCode ?? null;
    // orderCode = "<externalOrderId>:<orderDetailCode>"
    const [externalOrderIdFromCode, detailCodeFromOrderCode] =
      typeof orderCode === "string" && orderCode.includes(":")
        ? orderCode.split(":")
        : [null, null];
    const orderDetails: any[] = Array.isArray(data?.orderDetails)
      ? data.orderDetails
      : [];

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Build (detailCode -> details) map. Each detailOrderDetailCode is the UUID
    // we sent as orderDetailCode (= our order_items.id) when registering the order.
    const detailMap = new Map<string, any>();
    for (const d of orderDetails) {
      const code = d?.detailOrderDetailCode ?? d?.orderDetailCode;
      if (code) detailMap.set(String(code), d);
    }
    // Single-item orderCode fallback
    if (detailMap.size === 0 && detailCodeFromOrderCode) {
      detailMap.set(detailCodeFromOrderCode, {
        detailZipUrl: data?.detailZipUrl ?? data?.zipUrl ?? null,
      });
    }

    let updated = 0;
    let matched = 0;

    for (const [detailCode, detail] of detailMap.entries()) {
      // Our orderDetailCode is the order_items.id (UUID)
      const { data: rows } = await service
        .from("order_items")
        .select("id, zakeke_order_id, zakeke_print_files")
        .eq("id", detailCode);

      if (!rows || rows.length === 0) {
        console.warn("zakeke-webhook: no order_item match for detailCode", detailCode);
        continue;
      }
      matched += rows.length;

      const zipUrl: string | null =
        detail?.detailZipUrl ?? detail?.zipUrl ?? null;
      const update: Record<string, unknown> = {};
      if (zakekeOrderId) update.zakeke_order_id = String(zakekeOrderId);

      // Prefer individual print files (front/back/mockup) over a single ZIP
      // so the admin can download just what they need. Only fall back to
      // the ZIP url when Zakeke hasn't exposed individual files yet.
      let individual: Awaited<ReturnType<typeof getZakekeOrderOutputFiles>> = [];
      if (zakekeOrderId) {
        try {
          individual = await getZakekeOrderOutputFiles(String(zakekeOrderId));
        } catch (e) {
          console.error("zakeke-webhook output-files fetch failed:", e);
        }
      }
      // Drop pure ZIP entries if we also have individual files.
      const hasIndividual = individual.some(
        (f) => !/\.zip(\?|$)/i.test(f.url) && f.side !== "production-zip",
      );
      const filtered = hasIndividual
        ? individual.filter(
            (f) => !/\.zip(\?|$)/i.test(f.url) && f.side !== "production-zip",
          )
        : individual;
      if (filtered.length > 0) {
        update.zakeke_print_files = filtered;
      } else if (zipUrl) {
        update.zakeke_print_files = [
          { type: "zip", url: zipUrl, fileName: zipUrl.split("/").pop(), side: "production-zip" },
        ];
      }

      if (Object.keys(update).length > 0) {
        const { error: updErr } = await service
          .from("order_items")
          .update(update)
          .eq("id", rows[0].id);
        if (updErr) {
          console.error("zakeke-webhook update error:", updErr);
        } else {
          updated += 1;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("zakeke-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
