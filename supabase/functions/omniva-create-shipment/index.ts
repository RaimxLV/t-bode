import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  OMNIVA_SENDER,
  OMNIVA_API_BASE,
  OMNIVA_SERVICE_PA,
  OMNIVA_SERVICE_COURIER,
  corsHeaders,
  getOmnivaAuthHeader,
  escapeXml,
} from "../_shared/omniva-config.ts";

interface OmnivaLocationLite {
  ZIP: string;
  NAME: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
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
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");
    if (order.omniva_barcode) {
      return new Response(
        JSON.stringify({ error: "Shipment already created", barcode: order.omniva_barcode }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const customerCode = Deno.env.get("OMNIVA_CUSTOMER_CODE");
    if (!customerCode) throw new Error("OMNIVA_CUSTOMER_CODE not configured");

    const recipientName = order.shipping_name || "Recipient";
    const recipientPhone = order.shipping_phone || "";
    const recipientEmail = order.guest_email || "";
    const isPickup = !!order.omniva_pickup_point;
    const serviceCode = isPickup ? OMNIVA_SERVICE_PA : OMNIVA_SERVICE_COURIER;

    // Pickup point code is encoded in shipping_zip when omniva_pickup_point is set
    // (or just use the pickup point name; Omniva API needs offloadPostcode = pickup ZIP)
    const offloadPostcode = isPickup
      ? (order.shipping_zip || "")
      : "";

    // Reference = order number (visible on label)
    const reference = String(order.order_number || order.id.slice(0, 8));

    // Build Omniva XML SOAP request
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://service.core.epmx.application.eestipost.ee/xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <xsd:businessToClientMsgRequest>
      <partner>${escapeXml(customerCode)}</partner>
      <interchange msg_type="info11">
        <header file_id="${Date.now()}" sender_cd="${escapeXml(customerCode)}"/>
        <item_list>
          <item service="${serviceCode}">
            <additional_services>
              ${recipientEmail ? '<option code="ST"/>' : ''}
            </additional_services>
            <measures weight="1.0" length="0.3" width="0.2" height="0.15"/>
            <receiverAddressee>
              <person_name>${escapeXml(recipientName)}</person_name>
              <phone>${escapeXml(recipientPhone)}</phone>
              ${recipientEmail ? `<mobile>${escapeXml(recipientPhone)}</mobile><email>${escapeXml(recipientEmail)}</email>` : ''}
              <address ${isPickup ? `offloadPostcode="${escapeXml(offloadPostcode)}"` : ''} postcode="${escapeXml(order.shipping_zip || '')}" deliverypoint="${escapeXml(order.shipping_city || '')}" country="LV" street="${escapeXml(order.shipping_address || '')}"/>
            </receiverAddressee>
            <returnAddressee>
              <person_name>${escapeXml(OMNIVA_SENDER.contact_person)}</person_name>
              <phone>${escapeXml(OMNIVA_SENDER.phone)}</phone>
              <email>${escapeXml(OMNIVA_SENDER.email)}</email>
              <address postcode="${OMNIVA_SENDER.postcode.replace('LV-', '')}" deliverypoint="${escapeXml(OMNIVA_SENDER.city)}" country="LV" street="${escapeXml(OMNIVA_SENDER.street)}"/>
            </returnAddressee>
            <onloadAddressee>
              <person_name>${escapeXml(OMNIVA_SENDER.company)}</person_name>
              <phone>${escapeXml(OMNIVA_SENDER.phone)}</phone>
              <email>${escapeXml(OMNIVA_SENDER.email)}</email>
              <address postcode="${OMNIVA_SENDER.postcode.replace('LV-', '')}" deliverypoint="${escapeXml(OMNIVA_SENDER.city)}" country="LV" street="${escapeXml(OMNIVA_SENDER.street)}"/>
            </onloadAddressee>
            <reference_number>${escapeXml(reference)}</reference_number>
          </item>
        </item_list>
      </interchange>
    </xsd:businessToClientMsgRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    const omnivaResp = await fetch(OMNIVA_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "",
        "Authorization": getOmnivaAuthHeader(),
      },
      body: xml,
    });

    const respText = await omnivaResp.text();
    console.log("Omniva response status:", omnivaResp.status);
    console.log("Omniva response body:", respText.slice(0, 2000));

    if (!omnivaResp.ok) {
      throw new Error(`Omniva API error ${omnivaResp.status}: ${respText.slice(0, 500)}`);
    }

    // Extract barcode from response (look for <barcode>XX</barcode>)
    const barcodeMatch = respText.match(/<barcode[^>]*>([^<]+)<\/barcode>/);
    const barcode = barcodeMatch?.[1];
    if (!barcode) {
      throw new Error("No barcode in Omniva response: " + respText.slice(0, 500));
    }

    // Update order
    const { error: updErr } = await supabase
      .from("orders")
      .update({
        omniva_barcode: barcode,
        omniva_tracking_status: "registered",
        omniva_shipment_created_at: new Date().toISOString(),
      })
      .eq("id", order_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, barcode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("omniva-create-shipment error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
