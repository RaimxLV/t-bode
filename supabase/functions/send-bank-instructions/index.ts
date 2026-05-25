import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Paldies par pasūtījumu! Rekvizīti apmaksai" : "Thank you for your order! Payment details",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Paldies par pasūtījumu! Lūdzu, veic apmaksu ar bankas pārskaitījumu, izmantojot zemāk norādītos rekvizītus. Apmaksas termiņš — 3 darba dienas."
      : "Thank you for your order! Please complete the payment via bank transfer using the details below. Payment is due within 3 business days.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  total: lang === "lv" ? "Summa" : "Amount",
  details: lang === "lv" ? "Bankas rekvizīti" : "Bank details",
  beneficiary: lang === "lv" ? "Saņēmējs" : "Beneficiary",
  bank: lang === "lv" ? "Banka" : "Bank",
  iban: "IBAN",
  swift: "SWIFT",
  reference: lang === "lv" ? "Maksājuma mērķis" : "Payment reference",
  important:
    lang === "lv"
      ? "SVARĪGI: lūdzu maksājuma mērķī norādi tieši šo pasūtījuma numuru, lai mēs varam ātri atpazīt apmaksu."
      : "IMPORTANT: please use exactly this order number as the payment reference so we can match the payment quickly.",
  afterPaid:
    lang === "lv"
      ? "Kad apmaksa būs saņemta (parasti 1 darba dienas laikā), saņemsi atsevišķu apstiprinājumu ar rēķinu."
      : "Once the payment is received (usually within 1 business day), you will get a separate confirmation with the invoice.",
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
      <p style="margin:0 0 4px;"><strong>${tr.bank}:</strong> ${settings.bank_name}</p>
      <p style="margin:0 0 4px;"><strong>${tr.iban}:</strong> ${settings.bank_iban}</p>
      <p style="margin:0 0 4px;"><strong>${tr.swift}:</strong> ${settings.bank_swift}</p>
      <p style="margin:0;"><strong>${tr.reference}:</strong> ${ref}</p>
    </div>

    <p style="margin:16px 0 8px;color:#b45309;font-weight:bold;line-height:1.5;">${tr.important}</p>
    <p style="margin:16px 0 8px;color:#444;line-height:1.5;">${tr.afterPaid}</p>
    <p style="margin:24px 0 0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, lang } = await req.json();
    if (!order_id) throw new Error("order_id required");
    const language: Lang = lang === "en" ? "en" : "lv";

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: settings } = await service
      .from("site_settings")
      .select("bank_beneficiary, bank_name, bank_iban, bank_swift")
      .limit(1)
      .maybeSingle();
    if (!settings) throw new Error("Bank settings not configured");

    const { data: order } = await service
      .from("orders")
      .select("id, order_number, total, guest_email, user_id, shipping_name, payment_method")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.payment_method !== "bank_transfer") {
      return new Response(JSON.stringify({ skipped: true, reason: "not bank transfer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientEmail: string | null = order.guest_email;
    if (!recipientEmail && order.user_id) {
      const { data: u } = await service.auth.admin.getUserById(order.user_id);
      recipientEmail = u?.user?.email ?? null;
    }
    if (!recipientEmail) throw new Error("No recipient email");

    const html = renderHtml(order, settings, language);
    const subject = `${t(language).subject} #${String(order.order_number).padStart(5, "0")}`;

    const result = await sendLovableTransactional(service, {
      template: "bank-instructions",
      to: recipientEmail,
      subject,
      html,
      idempotencyKey: `bank-instructions-${order_id}`,
      metadata: { order_id, order_number: order.order_number, lang: language },
    });

    if (!result.ok) throw new Error(result.error || "send failed");

    return new Response(JSON.stringify({ sent: true, to: recipientEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-bank-instructions error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});