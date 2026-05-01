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

    const zakekeOrderId =
      body?.orderId ?? body?.orderID ?? body?.id ?? body?.order?.id ?? null;
    const zakekeOrderItemId =
      body?.orderItemId ?? body?.orderItemID ?? body?.itemId ?? null;

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the matching order_item row(s).
    const query = service
      .from("order_items")
      .select("id, zakeke_order_id, zakeke_order_item_id");

    let rows: any[] = [];
    if (zakekeOrderItemId) {
      const { data } = await query.eq(
        "zakeke_order_item_id",
        String(zakekeOrderItemId)
      );
      rows = data ?? [];
    }
    if (rows.length === 0 && zakekeOrderId) {
      const { data } = await query.eq("zakeke_order_id", String(zakekeOrderId));
      rows = data ?? [];
    }

    if (rows.length === 0) {
      console.warn("zakeke-webhook: no matching order_item", {
        zakekeOrderId,
        zakekeOrderItemId,
      });
      // Acknowledge anyway so Zakeke doesn't retry forever.
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    for (const row of rows) {
      try {
        const files = row.zakeke_order_item_id
          ? await getZakekeOrderItemFiles(row.zakeke_order_item_id)
          : await getZakekeOrderOutputFiles(row.zakeke_order_id);
        if (files.length > 0) {
          await service
            .from("order_items")
            .update({ zakeke_print_files: files })
            .eq("id", row.id);
          updated += 1;
        }
      } catch (e) {
        console.error(`zakeke-webhook fetch files for ${row.id}:`, e);
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
