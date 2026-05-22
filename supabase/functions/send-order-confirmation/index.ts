import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Pasūtījums apstiprināts" : "Order confirmed",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  thanks:
    lang === "lv"
      ? "Paldies par pasūtījumu! Esam saņēmuši Tavu apmaksu un sākam to apstrādāt."
      : "Thank you for your order! We've received your payment and started processing it.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  items: lang === "lv" ? "Preces" : "Items",
  total: lang === "lv" ? "Kopā" : "Total",
  shipping: lang === "lv" ? "Piegāde" : "Shipping",
  pickup: lang === "lv" ? "Pickup punkts" : "Pickup point",
  questions:
    lang === "lv"
      ? "Ja Tev ir jautājumi, atbildi uz šo e-pastu."
      : "If you have any questions, just reply to this email.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, items: any[], lang: Lang) {
  const tr = t(lang);
  const itemsRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${it.product_name}${it.size ? ` · ${it.size}` : ""}${it.color ? ` · ${it.color}` : ""}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">€${Number(it.unit_price).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const pickup = order.omniva_pickup_point || order.montonio_pickup_point_name || "";
  const address = [order.shipping_address, order.shipping_city, order.shipping_zip]
    .filter(Boolean)
    .join(", ");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 20px;line-height:1.5;">${tr.thanks}</p>

    <p style="margin:0 0 8px;"><strong>${tr.orderNo}</strong> #${String(order.order_number).padStart(5, "0")}</p>

    <h3 style="font-size:14px;margin:24px 0 8px;text-transform:uppercase;color:#555;">${tr.items}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${itemsRows}
      <tr>
        <td style="padding:12px 0;font-weight:bold;" colspan="2">${tr.total}</td>
        <td style="padding:12px 0;font-weight:bold;text-align:right;">€${Number(order.total).toFixed(2)}</td>
      </tr>
    </table>

    ${
      pickup || address
        ? `<h3 style="font-size:14px;margin:24px 0 8px;text-transform:uppercase;color:#555;">${tr.shipping}</h3>
           <p style="margin:0 0 4px;">${pickup ? `${tr.pickup}: ${pickup}` : address}</p>`
        : ""
    }

    <p style="margin:24px 0 8px;color:#555;">${tr.questions}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, lang } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const language: Lang = lang === "en" ? "en" : "lv";

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");

    const recipient = order.guest_email || (order.user_id ? null : null);
    let toEmail = recipient;
    if (!toEmail && order.user_id) {
      const { data: authUser } = await service.auth.admin.getUserById(order.user_id);
      toEmail = authUser?.user?.email ?? null;
    }
    if (!toEmail) throw new Error("No recipient email found for order");

    const { data: items } = await service
      .from("order_items")
      .select("*")
      .eq("order_id", order_id);

    const html = renderHtml(order, items ?? [], language);
    const subject = `${t(language).subject} #${String(order.order_number).padStart(5, "0")}`;

    // For B2B orders, include a signed download link to the current invoice PDF
    // (Lovable Emails does not support file attachments)
    let invoiceHtml = "";
    if (order.is_business) {
      try {
        const { data: inv } = await service
          .from("invoices").select("pdf_path, invoice_number, version")
          .eq("order_id", order_id).eq("is_current", true).maybeSingle();
        if (inv?.pdf_path) {
          const { data: signed } = await service.storage
            .from("invoices")
            .createSignedUrl(inv.pdf_path, 60 * 60 * 24 * 30); // 30 days
          if (signed?.signedUrl) {
            const label = language === "lv" ? "Lejupielādēt rēķinu" : "Download invoice";
            invoiceHtml = `<p style="margin:16px 0 0;"><a href="${signed.signedUrl}" style="display:inline-block;background:#DC2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">${label} (${inv.invoice_number})</a></p>`;
          }
        }
      } catch (e) {
        console.error("Failed to build invoice link:", (e as Error).message);
      }
    }

    const htmlWithInvoice = invoiceHtml
      ? html.replace("</div>\n</body>", `${invoiceHtml}</div>\n</body>`)
      : html;

    const result = await sendLovableTransactional(service, {
      template: "order-confirmation",
      to: toEmail,
      subject,
      html: htmlWithInvoice,
      idempotencyKey: `order-confirmation-${order_id}`,
      metadata: { order_id, order_number: order.order_number, lang: language },
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "Failed to enqueue email", detail: result.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    return new Response(JSON.stringify({ queued: true, to: toEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("send-order-confirmation error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});