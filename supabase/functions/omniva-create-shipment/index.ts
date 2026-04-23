import { createClient } from "npm:@supabase/supabase-js@2.57.2";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const steps: Array<{ step: string; status: "ok" | "error" | "info"; detail?: string }> = [];
  const log = (step: string, status: "ok" | "error" | "info", detail?: string) => {
    steps.push({ step, status, detail });
    console.log(`[${status.toUpperCase()}] ${step}${detail ? ": " + detail : ""}`);
  };

  try {
    log("Function boot", "info", "Request received");

    const envPresence = {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      OMNIVA_USERNAME: !!Deno.env.get("OMNIVA_USERNAME"),
      OMNIVA_PASSWORD: !!Deno.env.get("OMNIVA_PASSWORD"),
      OMNIVA_CUSTOMER_CODE: !!Deno.env.get("OMNIVA_CUSTOMER_CODE"),
    };
    log(
      "Environment variables check",
      Object.values(envPresence).every(Boolean) ? "ok" : "error",
      Object.entries(envPresence)
        .map(([key, present]) => `${key}=${present ? "present" : "missing"}`)
        .join(", "),
    );

    if (!envPresence.SUPABASE_URL || !envPresence.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const body = await req.json();
    const { order_id, debug } = body;
    log("Parse request", "ok", `order_id=${order_id}, debug=${!!debug}`);
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
      log("Authorization header", "error", "Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      log("User verification", "error", userErr?.message ?? "No user in token");
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
      log("Admin role check", "error", `User ${userData.user.email ?? userData.user.id} is not admin`);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("Admin auth verified", "ok", userData.user.email ?? undefined);

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");
    log("Order loaded", "ok", `#${order.order_number} → ${order.shipping_name}`);
    if (order.omniva_barcode) {
      return new Response(
        JSON.stringify({ error: "Shipment already created", barcode: order.omniva_barcode, steps }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const customerCode = Deno.env.get("OMNIVA_CUSTOMER_CODE");
    if (!customerCode) throw new Error("OMNIVA_CUSTOMER_CODE not configured");
    log("Omniva credentials present", "ok", "Customer code and login secrets are available");

    const recipientName = order.shipping_name || "Recipient";
    const recipientPhone = order.shipping_phone || "";
    const recipientEmail = order.guest_email || "";
    const isPickup = !!order.omniva_pickup_point;
    const serviceCode = isPickup ? OMNIVA_SERVICE_PA : OMNIVA_SERVICE_COURIER;
    log("Service resolved", "ok", `${isPickup ? "Parcel machine" : "Courier"} (${serviceCode})`);

    // For pickup: Omniva needs the parcel-machine ZIP as offloadPostcode.
    // We resolve it from the public Omniva locations feed by matching the saved name.
    let offloadPostcode = "";
    if (isPickup) {
      offloadPostcode = order.shipping_zip || "";
      if (!offloadPostcode) {
        try {
          const locResp = await fetch("https://www.omniva.lv/locations.json");
          const locs = await locResp.json() as Array<{ ZIP: string; NAME: string; A0_NAME: string; TYPE: string }>;
          const target = String(order.omniva_pickup_point).trim().toLowerCase();
          const match = locs.find(
            (l) => l.A0_NAME === "LV" && l.TYPE === "0" && l.NAME.trim().toLowerCase() === target,
          );
          if (match) offloadPostcode = match.ZIP;
          log("Resolved pickup ZIP from feed", match ? "ok" : "error",
            match ? `${order.omniva_pickup_point} → ${match.ZIP}` : `No match for "${order.omniva_pickup_point}"`);
        } catch (e) {
          console.error("Failed to resolve pickup ZIP:", (e as Error).message);
          log("Locations feed fetch failed", "error", (e as Error).message);
        }
      } else {
        log("Pickup ZIP from order", "ok", offloadPostcode);
      }
      if (!offloadPostcode) {
        throw new Error(
          `Could not resolve Omniva pickup point ZIP for "${order.omniva_pickup_point}". Please set shipping_zip manually.`,
        );
      }
    }

    // Reference = order number (visible on label)
    const reference = String(order.order_number || order.id.slice(0, 8));
    log("Reference", "ok", reference);

    try {
      const authHeaderPreview = getOmnivaAuthHeader();
      log(
        "Omniva auth header",
        "ok",
        `Basic auth encoded (${authHeaderPreview.startsWith("Basic ") ? "valid prefix" : "missing prefix"}, length=${authHeaderPreview.length})`,
      );
    } catch (authErr: any) {
      throw new Error(`Omniva auth header failed: ${authErr?.message ?? String(authErr)}`);
    }

    // DEBUG/TEST MODE: stop before calling Omniva, show what would be sent
    if (debug) {
      log("DEBUG mode — skipping Omniva API call", "info",
        `Would POST to ${OMNIVA_API_BASE} with service=${serviceCode}, offloadPostcode=${offloadPostcode || "(courier)"}`);
      return new Response(JSON.stringify({
        success: true,
        debug: true,
        steps,
        preview: {
          service: serviceCode,
          isPickup,
          recipient: { name: recipientName, phone: recipientPhone, email: recipientEmail },
          address: {
            offloadPostcode,
            postcode: order.shipping_zip,
            city: order.shipping_city,
            street: order.shipping_address,
          },
          reference,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
    log("Omniva API responded", omnivaResp.ok ? "ok" : "error",
      `HTTP ${omnivaResp.status} — ${respText.slice(0, 300)}`);

    if (!omnivaResp.ok) {
      throw new Error(`Omniva API error ${omnivaResp.status}: ${respText.slice(0, 500)}`);
    }

    // Extract barcode from response (look for <barcode>XX</barcode>)
    const barcodeMatch = respText.match(/<barcode[^>]*>([^<]+)<\/barcode>/);
    const barcode = barcodeMatch?.[1];
    if (!barcode) {
      throw new Error("No barcode in Omniva response: " + respText.slice(0, 500));
    }
    log("Barcode extracted", "ok", barcode);

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
    log("Order updated with barcode", "ok");

    return new Response(JSON.stringify({ success: true, barcode, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("omniva-create-shipment error:", err.message);
    log("Fatal error", "error", err.message);
    return new Response(JSON.stringify({ error: err.message, steps }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
