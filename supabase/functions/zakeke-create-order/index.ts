import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createZakekeOrder } from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Called from Stripe / Montonio webhooks after a successful payment.
 * Body: { order_id: string }
 * - Reads order_items for that order
 * - For each item with a zakeke_design_id and no zakeke_order_id yet,
 *   creates a Zakeke order and stores the returned id back on the row.
 *
 * If an item has no zakeke_design_id (e.g. non-customised product), it is
 * silently skipped. Errors per-item are logged but don't fail the whole call.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body?.order_id;
    if (!orderId || typeof orderId !== "string") {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: items, error } = await supabase
      .from("order_items")
      .select("id, quantity, zakeke_design_id, zakeke_order_id")
      .eq("order_id", orderId);

    if (error) throw error;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customisedItems = items.filter(
      (it) => it.zakeke_design_id && !it.zakeke_order_id
    );

    if (customisedItems.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, skipped: items.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const errors: Array<{ item_id: string; error: string }> = [];

    // Create one Zakeke order per item so that print-files map 1:1 with the row.
    for (const it of customisedItems) {
      try {
        const { zakekeOrderId } = await createZakekeOrder({
          externalOrderId: `${orderId}:${it.id}`,
          items: [
            {
              designId: it.zakeke_design_id as string,
              quantity: it.quantity ?? 1,
              reference: it.id,
            },
          ],
        });

        const { error: upErr } = await supabase
          .from("order_items")
          .update({ zakeke_order_id: zakekeOrderId })
          .eq("id", it.id);
        if (upErr) throw upErr;
        processed += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`zakeke-create-order item ${it.id} failed:`, msg);
        errors.push({ item_id: it.id, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ ok: errors.length === 0, processed, errors }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("zakeke-create-order error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});