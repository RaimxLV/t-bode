import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, getOmnivaAuthHeader } from "../_shared/omniva-config.ts";

// New OMX JSON API (per Omniva OMX API manual section 1.10.2 — barcode-based tracking).
// LIVE: https://omx.omniva.eu/api/v01/omx/shipments/{barcode}
const OMX_BASE = "https://omx.omniva.eu/api/v01/omx/shipments";

// Maps an Omniva event (code or name) -> our internal status.
function mapOmnivaEvent(code: string, name: string): { tracking: string; orderStatus?: string } {
  const s = `${code} ${name}`.toUpperCase();
  if (s.includes("DELIVERED")) return { tracking: "delivered", orderStatus: "delivered" };
  if (s.includes("OUT_FOR_DELIVERY") || s.includes("OUT FOR DELIVERY") || s.includes("IN_DELIVERY")) {
    return { tracking: "out_for_delivery", orderStatus: "shipped" };
  }
  if (s.includes("ARRIVED") || s.includes("IN_TRANSIT") || s.includes("IN TRANSIT") || s.includes("ACCEPTED") || s.includes("SORTING") || s.includes("DEPARTED")) {
    return { tracking: "in_transit", orderStatus: "shipped" };
  }
  if (s.includes("RETURN")) return { tracking: "returned" };
  return { tracking: (code || name || "unknown").toLowerCase() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch all orders with barcode that aren't yet delivered
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, omniva_barcode, omniva_tracking_status, guest_email, user_id, shipping_name, order_number, tracking_email_sent_at")
      .not("omniva_barcode", "is", null)
      .not("omniva_tracking_status", "in", "(delivered,returned)");
    if (error) throw error;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: "No active shipments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const trackingResults: Array<{ orderId: string; barcode: string; newStatus: string; isFirstShipped: boolean }> = [];

    // Omniva OMX rate-limits to ~10 requests/min for barcode-based tracking.
    // Throttle to ~8 req/min (7.5s between calls) and stop early on 429 — the
    // next cron tick picks up where we left off.
    const RATE_DELAY_MS = 7500;
    let i = 0;
    let rateLimited = false;
    for (const order of orders) {
      if (i++ > 0) await new Promise((r) => setTimeout(r, RATE_DELAY_MS));
      try {
        const resp = await fetch(`${OMX_BASE}/${encodeURIComponent(order.omniva_barcode!)}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": getOmnivaAuthHeader(),
          },
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          console.error(`Tracking failed for ${order.omniva_barcode}: ${resp.status} ${errText.slice(0, 200)}`);
          if (resp.status === 429) { rateLimited = true; break; }
          continue;
        }
        const data = await resp.json().catch(() => null) as any;
        const events: Array<{ eventCode?: string; eventName?: string; eventDate?: string }> =
          Array.isArray(data?.events) ? data.events : [];
        if (events.length === 0) {
          console.log(`No events for ${order.omniva_barcode}: ${JSON.stringify(data).slice(0, 300)}`);
          continue;
        }
        // Pick the latest event by date when available, otherwise the last element.
        const sorted = [...events].sort((a, b) => {
          const ta = a.eventDate ? Date.parse(a.eventDate) : 0;
          const tb = b.eventDate ? Date.parse(b.eventDate) : 0;
          return ta - tb;
        });
        const latest = sorted[sorted.length - 1];
        const { tracking, orderStatus } = mapOmnivaEvent(latest.eventCode || "", latest.eventName || "");
        console.log(`Tracked ${order.omniva_barcode}: event=${latest.eventCode}/${latest.eventName} → ${tracking}`);

        if (tracking === order.omniva_tracking_status) continue;

        const updates: Record<string, any> = { omniva_tracking_status: tracking };
        if (orderStatus) updates.status = orderStatus;
        await supabase.from("orders").update(updates).eq("id", order.id);
        updated++;

        const isFirstShipped =
          (tracking === "in_transit" || tracking === "out_for_delivery") &&
          !order.tracking_email_sent_at;
        trackingResults.push({
          orderId: order.id,
          barcode: order.omniva_barcode!,
          newStatus: tracking,
          isFirstShipped,
        });
      } catch (innerErr: any) {
        console.error(`Order ${order.id} sync error:`, innerErr.message);
      }
    }

    // Trigger tracking emails for first-time shipped orders
    for (const r of trackingResults.filter((x) => x.isFirstShipped)) {
      try {
        await supabase.functions.invoke("send-tracking-email", {
          body: { order_id: r.orderId },
        });
      } catch (e: any) {
        console.error(`send-tracking-email failed for ${r.orderId}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ updated, total: orders.length, rateLimited }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("omniva-tracking-sync error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
