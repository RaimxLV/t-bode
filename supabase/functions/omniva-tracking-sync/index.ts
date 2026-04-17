import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, getOmnivaAuthHeader, escapeXml } from "../_shared/omniva-config.ts";

const OMNIVA_TRACK_URL = "https://edixml.post.ee/epmx/services/messagesService.wsdl";

// Maps Omniva event status codes -> our internal status
function mapOmnivaStatus(eventStatus: string): { tracking: string; orderStatus?: string } {
  const s = eventStatus.toUpperCase();
  if (s.includes("DELIVERED") || s === "21") return { tracking: "delivered", orderStatus: "delivered" };
  if (s.includes("IN_DELIVERY") || s.includes("OUT_FOR_DELIVERY")) return { tracking: "out_for_delivery", orderStatus: "shipped" };
  if (s.includes("IN_TRANSIT") || s.includes("ACCEPTED")) return { tracking: "in_transit", orderStatus: "shipped" };
  if (s.includes("RETURN")) return { tracking: "returned" };
  return { tracking: s.toLowerCase() };
}

serve(async (req) => {
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

    const customerCode = Deno.env.get("OMNIVA_CUSTOMER_CODE");
    if (!customerCode) throw new Error("OMNIVA_CUSTOMER_CODE not configured");

    let updated = 0;
    const trackingResults: Array<{ orderId: string; barcode: string; newStatus: string; isFirstShipped: boolean }> = [];

    // Omniva supports batch tracking — but we go one-by-one for simplicity & error isolation
    for (const order of orders) {
      try {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://service.core.epmx.application.eestipost.ee/xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <xsd:singleAddressbasedPostalParcelEventReportRequest>
      <partner>${escapeXml(customerCode)}</partner>
      <barcode>${escapeXml(order.omniva_barcode!)}</barcode>
    </xsd:singleAddressbasedPostalParcelEventReportRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

        const resp = await fetch(OMNIVA_TRACK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "",
            "Authorization": getOmnivaAuthHeader(),
          },
          body: xml,
        });
        if (!resp.ok) {
          console.error(`Tracking failed for ${order.omniva_barcode}: ${resp.status}`);
          continue;
        }
        const respText = await resp.text();
        // Get the LAST event status (latest)
        const events = [...respText.matchAll(/<eventStatus[^>]*>([^<]+)<\/eventStatus>/g)];
        if (events.length === 0) continue;
        const latestStatus = events[events.length - 1][1];
        const { tracking, orderStatus } = mapOmnivaStatus(latestStatus);

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

    return new Response(JSON.stringify({ updated, total: orders.length }), {
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
