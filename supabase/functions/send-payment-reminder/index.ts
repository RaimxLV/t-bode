import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "T-Bode <onboarding@resend.dev>";
const TEST_OVERRIDE_EMAIL = "ofsetadruka@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Atgādinājums par apmaksu" : "Payment reminder",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Atgādinām, ka Tavs pasūtījums vēl gaida apmaksu ar bankas pārskaitījumu."
      : "This is a reminder that your order is still awaiting bank transfer payment.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  total: lang === "lv" ? "Summa" : "Amount",
  details: lang === "lv" ? "Bankas rekvizīti" : "Bank details",
  beneficiary: lang === "lv" ? "Saņēmējs" : "Beneficiary",
  iban: "IBAN",
  swift: "SWIFT",
  reference: lang === "lv" ? "Maksājuma mērķis" : "Payment reference",
  expiresNote:
    lang === "lv"
      ? "Ja apmaksa netiks saņemta tuvākajā laikā, pasūtījums tiks automātiski atcelts."
      : "If payment is not received soon, the order will be cancelled automatically.",
  questions:
    lang === "lv"
      ? "Ja apmaksa jau veikta, ignorē šo e-pastu."
      : "If you have already paid, please ignore this email.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, settings: any, lang: Lang) {
  const tr = t(lang);
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">${tr.intro}</p>
    <p style="margin:0 0 4px;"><strong>${tr.orderNo}</strong> ${ref}</p>
    <p style="margin:0 0 16px;"><strong>${tr.total}:</strong> €${Number(order.total).toFixed(2)}</p>

    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">${tr.details}</p>
      <p style="margin:0 0 4px;"><strong>${tr.beneficiary}:</strong> ${settings.bank_beneficiary}</p>
      <p style="margin:0 0 4px;"><strong>${tr.iban}:</strong> ${settings.bank_iban}</p>
      <p style="margin:0 0 4px;"><strong>${tr.swift}:</strong> ${settings.bank_swift}</p>
      <p style="margin:0;"><strong>${tr.reference}:</strong> ${ref}</p>
    </div>

    <p style="margin:16px 0 8px;color:#444;line-height:1.5;">${tr.expiresNote}</p>
    <p style="margin:16px 0 8px;color:#555;">${tr.questions}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const { order_id, lang } = body as { order_id?: string; lang?: string };

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: settings } = await service
      .from("site_settings")
      .select("bank_beneficiary, bank_iban, bank_swift")
      .limit(1)
      .maybeSingle();
    if (!settings) throw new Error("Bank settings not configured");

    // Single order mode (manual trigger from admin or specific id)
    const sendOne = async (orderId: string, language: Lang) => {
      const { data: order } = await service
        .from("orders")
        .select("id, order_number, total, guest_email, user_id, shipping_name, status, payment_method")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return { skipped: true, reason: "not found" };
      if (order.payment_method !== "bank_transfer") return { skipped: true, reason: "not bank transfer" };
      if (order.status !== "pending") return { skipped: true, reason: "not pending" };

      let recipientEmail: string | null = order.guest_email;
      if (!recipientEmail && order.user_id) {
        const { data: u } = await service.auth.admin.getUserById(order.user_id);
        recipientEmail = u?.user?.email ?? null;
      }
      if (!recipientEmail) return { skipped: true, reason: "no email" };

      const originalRecipient = recipientEmail;
      const toEmail = TEST_OVERRIDE_EMAIL;

      const html = renderHtml(order, settings, language);
      const subject = `${t(language).subject} #${String(order.order_number).padStart(5, "0")}`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [toEmail],
          subject: `[TEST → ${originalRecipient}] ${subject}`,
          html,
        }),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        console.error("Resend error:", resp.status, detail);
        return { sent: false, error: detail };
      }
      await service
        .from("orders")
        .update({ last_payment_reminder_at: new Date().toISOString() })
        .eq("id", orderId);
      return { sent: true, to: toEmail };
    };

    if (order_id) {
      const result = await sendOne(order_id, lang === "en" ? "en" : "lv");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk mode: scan for unpaid bank-transfer orders >= 3 days old, no reminder yet
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates } = await service
      .from("orders")
      .select("id")
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending")
      .lte("created_at", threeDaysAgo)
      .is("last_payment_reminder_at", null);

    let sent = 0;
    let skipped = 0;
    for (const o of candidates ?? []) {
      const r = await sendOne(o.id, "lv");
      if ((r as any).sent) sent++; else skipped++;
    }
    return new Response(JSON.stringify({ sent, skipped, total: candidates?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-payment-reminder error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});