import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, getOmnivaAuthHeader } from "../_shared/omniva-config.ts";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";

const ALERT_EMAIL = "Ofsetadruka@gmail.com";

// New OMX JSON API (per Omniva OMX API manual section 1.10.2 — barcode-based tracking).
// LIVE: https://omx.omniva.eu/api/v01/omx/shipments/{barcode}
const OMX_BASE = "https://omx.omniva.eu/api/v01/omx/shipments";

// Maps an Omniva event (code or name) -> our internal status.
function mapOmnivaEvent(code: string, name: string): { tracking: string; orderStatus?: string } {
  const s = `${code} ${name}`.toUpperCase();
  if (s.includes("DELIVERED")) return { tracking: "delivered", orderStatus: "delivered" };
  if (s.includes("ARRIVAL_PM") || s.includes("ARRIVED_PM") || s.includes("ARRIVED AT PARCEL") || s.includes("AWAITING")) {
    return { tracking: "awaiting_pickup", orderStatus: "shipped" };
  }
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
      // Still write a log row so the admin can see the cron is alive.
      await supabase.from("omniva_sync_logs").insert({
        total: 0, updated: 0, rate_limited: false, error_count: 0,
        deliveries: [], errors: [],
      });
      return new Response(JSON.stringify({ updated: 0, message: "No active shipments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const trackingResults: Array<{ orderId: string; barcode: string; newStatus: string; isFirstShipped: boolean }> = [];
    const deliveries: Array<{ barcode: string; order_number: number | null; status: string; event?: string }> = [];
    const errors: Array<{ barcode: string; order_number: number | null; status?: number; message: string }> = [];

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
          errors.push({
            barcode: order.omniva_barcode!,
            order_number: order.order_number ?? null,
            status: resp.status,
            message: errText.slice(0, 300) || `HTTP ${resp.status}`,
          });
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
        deliveries.push({
          barcode: order.omniva_barcode!,
          order_number: order.order_number ?? null,
          status: tracking,
          event: `${latest.eventCode || ""} ${latest.eventName || ""}`.trim(),
        });

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
        errors.push({
          barcode: order.omniva_barcode || "",
          order_number: order.order_number ?? null,
          message: innerErr?.message ?? String(innerErr),
        });
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

    // Save a run log
    const hasProblem = errors.length > 0 || rateLimited;
    const { data: logRow } = await supabase
      .from("omniva_sync_logs")
      .insert({
        total: orders.length,
        updated,
        rate_limited: rateLimited,
        error_count: errors.length,
        deliveries,
        errors,
      })
      .select("id")
      .maybeSingle();

    // Alert email on any error or rate-limit
    if (hasProblem) {
      try {
        const errRows = errors.slice(0, 20).map((e) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${e.order_number ? `#${String(e.order_number).padStart(5, "0")}` : "—"}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace;">${e.barcode || "—"}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${e.status ?? ""}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#b91c1c;">${escapeHtml(e.message)}</td></tr>`
        ).join("");
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#DC2626;padding:20px;text-align:center;color:#fff;">
      <h2 style="margin:0;">⚠️ Omniva sinhronizācijas brīdinājums</h2>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;">Omniva izsekošanas sinhronizācija ziņo par problēmām.</p>
      <ul style="line-height:1.7;">
        <li>Pārbaudīti sūtījumi: <strong>${orders.length}</strong></li>
        <li>Atjaunoti: <strong>${updated}</strong></li>
        <li>Kļūdas: <strong style="color:#b91c1c;">${errors.length}</strong></li>
        <li>Rate-limit: <strong>${rateLimited ? "JĀ" : "nē"}</strong></li>
      </ul>
      ${errRows ? `<h3 style="margin-top:20px;">Kļūdu detaļas</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f9f9f9;text-align:left;"><th style="padding:8px 10px;">Pasūt.</th><th style="padding:8px 10px;">Barkods</th><th style="padding:8px 10px;">HTTP</th><th style="padding:8px 10px;">Ziņojums</th></tr></thead>
        <tbody>${errRows}</tbody>
      </table>` : ""}
      ${rateLimited ? `<p style="margin-top:16px;color:#92400e;background:#fef3c7;padding:10px;border-radius:6px;">Omniva ierobežoja pieprasījumus. Atlikušie sūtījumi tiks pārbaudīti nākamajā sinhronizācijā.</p>` : ""}
      <p style="color:#666;font-size:12px;margin-top:20px;">Sinhronizācijas žurnālus var apskatīt admin panelī → Omniva sync.</p>
    </div>
  </div>
</body></html>`;
        const result = await sendLovableTransactional(supabase, {
          template: "omniva-sync-alert",
          to: ALERT_EMAIL,
          subject: `⚠️ Omniva sync: ${errors.length} kļūda(s)${rateLimited ? " + rate-limit" : ""}`,
          html,
          idempotencyKey: `omniva-sync-alert-${logRow?.id ?? Date.now()}`,
          metadata: { log_id: logRow?.id, errors: errors.length, rate_limited: rateLimited },
        });
        if (result.ok && logRow?.id) {
          await supabase.from("omniva_sync_logs").update({ alert_sent: true }).eq("id", logRow.id);
        }
      } catch (e: any) {
        console.error("Alert email failed:", e.message);
      }
    }

    return new Response(JSON.stringify({ updated, total: orders.length, rateLimited, errors: errors.length }), {
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

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
