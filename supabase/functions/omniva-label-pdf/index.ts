import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, getOmnivaAuthHeader, escapeXml } from "../_shared/omniva-config.ts";

const OMNIVA_LABEL_URL = "https://edixml.post.ee/epmx/services/messagesService.wsdl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const barcode = url.searchParams.get("barcode");
    const orderId = url.searchParams.get("order_id");
    if (!barcode && !orderId) {
      return new Response(JSON.stringify({ error: "barcode or order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    let useBarcode = barcode;
    if (!useBarcode && orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("omniva_barcode")
        .eq("id", orderId)
        .single();
      useBarcode = order?.omniva_barcode || null;
    }
    if (!useBarcode) {
      return new Response(JSON.stringify({ error: "No barcode for order" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerCode = Deno.env.get("OMNIVA_CUSTOMER_CODE");
    if (!customerCode) throw new Error("OMNIVA_CUSTOMER_CODE not configured");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://service.core.epmx.application.eestipost.ee/xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <xsd:addrcardMsgRequest>
      <partner>${escapeXml(customerCode)}</partner>
      <sendAddressCardTo>response</sendAddressCardTo>
      <barcodes>
        <barcode>${escapeXml(useBarcode)}</barcode>
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
    const respText = await resp.text();
    if (!resp.ok) throw new Error(`Omniva label error ${resp.status}: ${respText.slice(0, 500)}`);

    // Extract base64 PDF from <fileData>...</fileData>
    const m = respText.match(/<fileData[^>]*>([^<]+)<\/fileData>/);
    if (!m) throw new Error("No fileData in label response");
    const pdfBytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="omniva-${useBarcode}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("omniva-label-pdf error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
