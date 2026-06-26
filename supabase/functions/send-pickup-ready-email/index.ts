import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

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

    const orderNum = String(order.order_number).padStart(5, "0");
    const name = order.shipping_name || "";

    // Load editable e-mail content from site settings (admin can change in the panel).
    const { data: settingsRows } = await supabase.rpc("get_public_settings");
    const settings = Array.isArray(settingsRows) ? settingsRows[0] : settingsRows;
    const officeLv = settings?.office_address_lv || "Braslas iela 29, Ieeja D, Rīga, LV-1084";
    const officeEn = settings?.office_address_en || "Braslas iela 29, Entrance D, Riga, LV-1084";
    const hoursLv = settings?.office_hours_lv || "Pirmdiena–ceturtdiena: 9:00–17:30\nPiektdiena: 9:00–16:00\nSestdiena, svētdiena: slēgts";
    const hoursEn = settings?.office_hours_en || "Monday–Thursday: 9:00–17:30\nFriday: 9:00–16:00\nSaturday, Sunday: closed";
    const introLv = settings?.pickup_intro_lv || "Tavs pasūtījums ir izgatavots un gaida Tevi mūsu birojā. Iepriekšēja saskaņošana nav nepieciešama — vienkārši ieej biroja darba laikā.";
    const introEn = settings?.pickup_intro_en || "Your order is ready and waiting at our office. No appointment needed — just drop by during office hours.";
    const supportEmail = settings?.support_email || "info@t-bode.lv";

    const nl2br = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#000000;padding:24px;text-align:center;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:block;margin:0 auto;" />
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111;margin:0 0 16px;line-height:1.3;">Tavs pasūtījums ir gatavs saņemšanai! 🎉</h2>
      <p style="color:#444;line-height:1.6;">Sveiks${name ? `, ${name}` : ""}!</p>
      <p style="color:#444;line-height:1.6;">
        Pasūtījums <strong>#${orderNum}</strong>. ${nl2br(introLv)}
      </p>
      <div style="background:#f9f9f9;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Saņemšanas vieta:</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#111;">${nl2br(officeLv)}</p>
      </div>
      <div style="background:#fff5f5;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Biroja darba laiks:</p>
        <p style="margin:6px 0 0;color:#111;line-height:1.7;">${nl2br(hoursLv)}</p>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
      <h3 style="color:#111;margin:0 0 12px;font-size:16px;">Your order is ready for pickup! 🎉</h3>
      <p style="color:#444;line-height:1.6;">Hi${name ? `, ${name}` : ""}!</p>
      <p style="color:#444;line-height:1.6;">Order <strong>#${orderNum}</strong>. ${nl2br(introEn)}</p>
      <div style="background:#f9f9f9;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Pickup location:</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#111;">${nl2br(officeEn)}</p>
      </div>
      <div style="background:#fff5f5;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Office hours:</p>
        <p style="margin:6px 0 0;color:#111;line-height:1.7;">${nl2br(hoursEn)}</p>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;margin-top:24px;">
        Jautājumi / Questions? <a href="mailto:${supportEmail}" style="color:#DC2626;white-space:nowrap;">${supportEmail}</a>
      </p>
    </div>
    <div style="background:#111;padding:16px;text-align:center;color:#888;font-size:12px;">
      © ${new Date().getFullYear()} SIA Ervitex · <span style="white-space:nowrap;">T‑Bode</span>
    </div>
  </div>
</body>
</html>`;

    const result = await sendLovableTransactional(supabase, {
      template: "pickup-ready",
      to: recipientEmail,
      subject: `Tavs T-Bode pasūtījums #${orderNum} ir gatavs saņemšanai 🎉`,
      html,
      idempotencyKey: `pickup-ready-${order_id}`,
      metadata: { order_id, order_number: order.order_number },
    });
    if (!result.ok) throw new Error(`Enqueue failed: ${result.error}`);

    return new Response(JSON.stringify({ success: true, message_id: result.messageId }), {
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