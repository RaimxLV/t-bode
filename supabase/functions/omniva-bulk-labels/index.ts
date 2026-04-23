import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import JSZip from "npm:jszip@3.10.1";
import {
  corsHeaders,
  getOmnivaAuthHeader,
  escapeXml,
} from "../_shared/omniva-config.ts";

const OMNIVA_LABEL_URL = "https://edixml.post.ee/epmx/services/messagesService.wsdl";

// POSTs { order_ids: string[] } and returns a ZIP containing one PDF per Omniva label.
// Admin-only. Skips orders without a barcode.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_ids } = await req.json();
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "order_ids array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order_ids.length > 100) {
      return new Response(JSON.stringify({ error: "Maximum 100 labels per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    let allowed = !!roleRow;
    if (!allowed && userData.user.email) {
      const { data: wl } = await supabase.rpc("is_admin_whitelisted", { _email: userData.user.email });
      allowed = !!wl;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve barcodes
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, order_number, omniva_barcode, shipping_name")
      .in("id", order_ids);
    if (ordersErr) throw ordersErr;

    const withBarcode = (orders ?? []).filter((o) => !!o.omniva_barcode);
    if (withBarcode.length === 0) {
      return new Response(JSON.stringify({ error: "No selected orders have an Omniva barcode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zip = new JSZip();
    const failures: Array<{ order_id: string; reason: string }> = [];

    // Sequentially fetch each label so we don't hammer Omniva
    for (const order of withBarcode) {
      try {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://service.core.epmx.application.eestipost.ee/xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <xsd:addrcardMsgRequest>
      <partner></partner>
      <sendAddressCardTo>response</sendAddressCardTo>
      <barcodes>
        <barcode>${escapeXml(order.omniva_barcode!)}</barcode>
      </barcodes>
    </xsd:addrcardMsgRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

        const resp = await fetch(OMNIVA_LABEL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "",
            "Authorization": getOmnivaAuthHeader(),
          },
          body: xml,
        });
        const text = await resp.text();
        if (!resp.ok) {
          failures.push({ order_id: order.id, reason: `HTTP ${resp.status}` });
          continue;
        }
        const match = text.match(/<fileData[^>]*>([^<]+)<\/fileData>/);
        if (!match) {
          failures.push({ order_id: order.id, reason: "No fileData in Omniva response" });
          continue;
        }
        const binary = atob(match[1].trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const orderLabel = order.order_number != null
          ? String(order.order_number).padStart(4, "0")
          : order.id.slice(0, 8);
        zip.file(`omniva-${orderLabel}-${order.omniva_barcode}.pdf`, bytes);
      } catch (e: any) {
        failures.push({ order_id: order.id, reason: e?.message ?? String(e) });
      }
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const filename = `omniva-labels-${new Date().toISOString().slice(0, 10)}.zip`;

    return new Response(zipBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Labels-Included": String(withBarcode.length - failures.length),
        "X-Labels-Failed": String(failures.length),
      },
    });
  } catch (err: any) {
    console.error("omniva-bulk-labels error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});