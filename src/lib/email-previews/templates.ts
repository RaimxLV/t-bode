const LOGO_URL = "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png";

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

export interface SampleOrder {
  order_number: number;
  shipping_name: string;
  total: number;
  shipping_address?: string;
  shipping_city?: string;
  shipping_zip?: string;
  omniva_pickup_point?: string;
  omniva_barcode?: string;
}

export interface SampleItem {
  product_name: string;
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number;
}

export const SAMPLE_ORDER: SampleOrder = {
  order_number: 12,
  shipping_name: "Jānis Bērziņš",
  total: 45.9,
  omniva_pickup_point: "Rīga, Akropole, Maskavas iela 257",
  omniva_barcode: "AB123456789LV",
};

export const SAMPLE_ITEMS: SampleItem[] = [
  { product_name: "Custom T-Krekls", size: "L", color: "Melns", quantity: 1, unit_price: 24.95 },
  { product_name: "Krūze 'T-Bode'", quantity: 2, unit_price: 10.5 },
];

export function renderOrderConfirmationHtml(order: SampleOrder, items: SampleItem[], lang: Lang): string {
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

  const pickup = order.omniva_pickup_point || "";
  const address = [order.shipping_address, order.shipping_city, order.shipping_zip].filter(Boolean).join(", ");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:inline-block;" />
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

export function renderTrackingHtml(order: SampleOrder): string {
  const trackingUrl = `https://www.omniva.lv/private/track-and-trace?barcode=${order.omniva_barcode}`;
  const orderNum = String(order.order_number).padStart(5, "0");
  const name = order.shipping_name || "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#000000;padding:24px;text-align:center;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:block;margin:0 auto;" />
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111;margin:0 0 16px;">Tavs sūtījums ir ceļā! 📦</h2>
      <p style="color:#444;line-height:1.6;">Sveiks${name ? `, ${name}` : ""}!</p>
      <p style="color:#444;line-height:1.6;">
        Tavs pasūtījums <strong>#${orderNum}</strong> ir nodots Omniva un drīzumā tiks piegādāts.
      </p>
      <div style="background:#f9f9f9;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Izsekošanas numurs:</p>
        <p style="margin:4px 0 0;font-family:monospace;font-size:16px;font-weight:bold;color:#111;">${order.omniva_barcode}</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${trackingUrl}" style="background:#DC2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:bold;display:inline-block;">Sekot sūtījumam</a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;">
        Jautājumi? Raksti mums: <a href="mailto:eriks@ervitex.lv" style="color:#DC2626;">eriks@ervitex.lv</a>
      </p>
    </div>
    <div style="background:#111;padding:16px;text-align:center;color:#888;font-size:12px;">
      © ${new Date().getFullYear()} SIA Ervitex · T-Bode
    </div>
  </div>
</body>
</html>`;
}