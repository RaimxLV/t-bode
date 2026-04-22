import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, verifyMontonioJwt } from "../_shared/montonio.ts";

// Montonio posts: { orderToken: "<JWT>" } either as JSON body or query param.
// We verify the JWT with our secret, extract the status, and update the order.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let token: string | null = null;
    const url = new URL(req.url);
    token = url.searchParams.get("order-token") ?? url.searchParams.get("orderToken");

    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body?.orderToken ?? body?.["order-token"] ?? null;
      } catch {
        // ignore JSON parse errors — token may have been in query
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing orderToken" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const claims = await verifyMontonioJwt<{
      merchantReference?: string;
      status?: string;
      paymentStatus?: string;
      uuid?: string;
      shipment?: { trackingCode?: string; id?: string };
    }>(token);

    const orderId = claims.merchantReference;
    const status = (claims.status ?? claims.paymentStatus ?? "").toUpperCase();
    const trackingCode = claims.shipment?.trackingCode ?? null;
    const shipmentId = claims.shipment?.id ?? null;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "merchantReference missing in token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const update: Record<string, unknown> = {
      montonio_payment_status: status || "UNKNOWN",
    };
    if (claims.uuid) update.montonio_order_uuid = claims.uuid;
    if (trackingCode) update.montonio_tracking_number = trackingCode;
    if (shipmentId) update.montonio_shipment_id = shipmentId;

    if (status === "PAID" || status === "FINALIZED") {
      update.status = "confirmed";
    } else if (status === "ABANDONED" || status === "VOIDED" || status === "EXPIRED") {
      update.status = "cancelled";
    }

    await service.from("orders").update(update).eq("id", orderId);

    // Send confirmation email when payment is finalized
    if (status === "PAID" || status === "FINALIZED") {
      try {
        // Auto-generate invoice PDF before sending email (for B2B attachment)
        try {
          await service.functions.invoke("generate-invoice", {
            body: { order_id: orderId },
          });
        } catch (e) {
          console.error("Failed to auto-generate invoice:", (e as Error).message);
        }
        await service.functions.invoke("send-order-confirmation", {
          body: { order_id: orderId, lang: "lv" },
        });
      } catch (e) {
        console.error("Failed to send confirmation email:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("montonio-webhook error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
});