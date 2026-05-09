import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { logEmailAttempt, makeMessageId } from "../_shared/email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_ADDRESS = Deno.env.get("RESEND_FROM_EMAIL") ?? "T-Bode <onboarding@resend.dev>";

Deno.serve(async (req) => {
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

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, guest_email, user_id, shipping_name, omniva_pickup_point")
      .eq("id", order_id)
      .single();
    if (error || !order) throw new Error("Order not found");

    let recipientEmail = order.guest_email;
    if (!recipientEmail && order.user_id) {
      const { data: userResp } = await supabase.auth.admin.getUserById(order.user_id);
      recipientEmail = userResp?.user?.email || null;
    }
    if (!recipientEmail) throw new Error("No recipient email");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const orderNum = String(order.order_number).padStart(5, "0");
    const name = order.shipping_name || "";
    const office = (order.omniva_pickup_point || "BIROJS").replace(/^BIROJS:?\s*/i, "") || "T-Bode birojs";

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#000000;padding:24px;text-align:center;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:block;margin:0 auto;" />
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111;margin:0 0 16px;">Tavs pasūtījums ir gatavs saņemšanai! 🎉</h2>
      <p style="color:#444;line-height:1.6;">Sveiks${name ? `, ${name}` : ""}!</p>
      <p style="color:#444;line-height:1.6;">
        Tavs pasūtījums <strong>#${orderNum}</strong> ir izgatavots un gaida tevi birojā.
      </p>
      <div style="background:#f9f9f9;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Saņemšanas vieta:</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#111;">${office}</p>
      </div>
      <p style="color:#444;line-height:1.6;">
        Lūdzu, pirms ierašanās sazinies ar mums, lai saskaņotu laiku.
      </p>
      <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;margin-top:24px;">
        Jautājumi? Raksti mums: <a href="mailto:info@t-bode.lv" style="color:#DC2626;">info@t-bode.lv</a>
      </p>
    </div>
    <div style="background:#111;padding:16px;text-align:center;color:#888;font-size:12px;">
      © ${new Date().getFullYear()} SIA Ervitex · T-Bode
    </div>
  </div>
</body>
</html>`;

    const messageId = makeMessageId("pickup-ready");
    await logEmailAttempt(supabase, {
      message_id: messageId,
      template_name: "pickup-ready",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { order_id, order_number: order.order_number },
    });

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipientEmail],
        subject: `Tavs T-Bode pasūtījums #${orderNum} ir gatavs saņemšanai 🎉`,
        html,
      }),
    });

    const respJson = await resendResp.json();
    if (!resendResp.ok) {
      await logEmailAttempt(supabase, {
        message_id: messageId,
        template_name: "pickup-ready",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: JSON.stringify(respJson),
        metadata: { order_id, http_status: resendResp.status },
      });
      throw new Error(`Resend ${resendResp.status}: ${JSON.stringify(respJson)}`);
    }

    await logEmailAttempt(supabase, {
      message_id: messageId,
      template_name: "pickup-ready",
      recipient_email: recipientEmail,
      status: "sent",
      metadata: { order_id, order_number: order.order_number, resend_id: respJson.id },
    });

    return new Response(JSON.stringify({ success: true, message_id: respJson.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-pickup-ready-email error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});