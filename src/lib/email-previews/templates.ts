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
  shipping_address: "Braslas iela 29, Ieeja D",
  shipping_city: "Rīga",
  shipping_zip: "LV-1084",
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
        Jautājumi? Raksti mums: <a href="mailto:info@t-bode.lv" style="color:#DC2626;">info@t-bode.lv</a>
      </p>
    </div>
    <div style="background:#111;padding:16px;text-align:center;color:#888;font-size:12px;">
      © ${new Date().getFullYear()} SIA Ervitex · T-Bode
    </div>
  </div>
</body>
</html>`;
}

export function renderPickupReadyHtml(order: SampleOrder): string {
  const orderNum = String(order.order_number).padStart(5, "0");
  const name = order.shipping_name || "";
  const office = order.omniva_pickup_point || "T-Bode birojs, Braslas iela 29, Ieeja D, Rīga, LV-1084";

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#000000;padding:24px;text-align:center;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:block;margin:0 auto;" />
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111;margin:0 0 16px;line-height:1.3;">Tavs pasūtījums ir gatavs saņemšanai! 🎉</h2>
      <p style="color:#444;line-height:1.6;">Sveiks${name ? `, ${name}` : ""}!</p>
      <p style="color:#444;line-height:1.6;">
        Tavs pasūtījums <strong>#${orderNum}</strong> ir izgatavots un gaida Tevi mūsu birojā.
      </p>
      <div style="background:#f9f9f9;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Saņemšanas vieta:</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#111;">${office}</p>
      </div>
      <div style="background:#fff5f5;border-left:4px solid #DC2626;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#666;font-size:13px;">Biroja darba laiks:</p>
        <p style="margin:6px 0 0;color:#111;line-height:1.7;">
          Pirmdiena–ceturtdiena: <strong>9:00–17:30</strong><br>
          Piektdiena: <strong>9:00–16:00</strong><br>
          Sestdiena, svētdiena: <strong>slēgts</strong>
        </p>
      </div>
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
}

export function renderBankInstructionsHtml(order: SampleOrder): string {
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">Paldies par pasūtījumu! Rekvizīti apmaksai</h2>
    <p style="margin:0 0 16px;">Sveiki, ${order.shipping_name}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">Paldies par pasūtījumu! Lūdzu, veic apmaksu ar bankas pārskaitījumu, izmantojot zemāk norādītos rekvizītus. Apmaksas termiņš — 3 darba dienas.</p>
    <p style="margin:0 0 4px;"><strong>Pasūtījuma Nr.</strong> ${ref}</p>
    <p style="margin:0 0 16px;"><strong>Summa:</strong> €${Number(order.total).toFixed(2)}</p>
    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">Bankas rekvizīti</p>
      <p style="margin:0 0 4px;"><strong>Saņēmējs:</strong> SIA Ervitex</p>
      <p style="margin:0 0 4px;"><strong>Banka:</strong> Swedbank</p>
      <p style="margin:0 0 4px;"><strong>IBAN:</strong> LV00HABA0000000000000</p>
      <p style="margin:0 0 4px;"><strong>SWIFT:</strong> HABALV22</p>
      <p style="margin:0;"><strong>Maksājuma mērķis:</strong> ${ref}</p>
    </div>
    <p style="margin:16px 0 8px;color:#b45309;font-weight:bold;line-height:1.5;">SVARĪGI: lūdzu maksājuma mērķī norādi tieši šo pasūtījuma numuru, lai mēs varam ātri atpazīt apmaksu.</p>
    <p style="margin:16px 0 8px;color:#444;line-height:1.5;">Kad apmaksa būs saņemta, saņemsi atsevišķu apstiprinājumu ar rēķinu.</p>
    <p style="margin:24px 0 0;color:#555;">— T-Bode komanda</p>
  </div>
</body></html>`;
}

export function renderPaymentReminderHtml(order: SampleOrder): string {
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">Atgādinājums par apmaksu</h2>
    <p style="margin:0 0 16px;">Sveiki, ${order.shipping_name}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">Atgādinām, ka Tavs pasūtījums vēl gaida apmaksu ar bankas pārskaitījumu.</p>
    <p style="margin:0 0 4px;"><strong>Pasūtījuma Nr.</strong> ${ref}</p>
    <p style="margin:0 0 16px;"><strong>Summa:</strong> €${Number(order.total).toFixed(2)}</p>
    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">Bankas rekvizīti</p>
      <p style="margin:0 0 4px;"><strong>Saņēmējs:</strong> SIA Ervitex</p>
      <p style="margin:0 0 4px;"><strong>IBAN:</strong> LV00HABA0000000000000</p>
      <p style="margin:0 0 4px;"><strong>SWIFT:</strong> HABALV22</p>
      <p style="margin:0;"><strong>Maksājuma mērķis:</strong> ${ref}</p>
    </div>
    <p style="margin:16px 0 8px;color:#444;line-height:1.5;">Ja apmaksa netiks saņemta tuvākajā laikā, pasūtījums tiks automātiski atcelts.</p>
    <p style="margin:16px 0 8px;color:#555;">Ja apmaksa jau veikta, ignorē šo e-pastu.</p>
    <p style="margin:0;color:#555;">— T-Bode komanda</p>
  </div>
</body></html>`;
}

export function renderOrderCancelledHtml(order: SampleOrder): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">Pasūtījums atcelts</h2>
    <p style="margin:0 0 16px;">Sveiki, ${order.shipping_name}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">Diemžēl Tavs pasūtījums ir atcelts.</p>
    <p style="margin:0 0 16px;"><strong>Pasūtījuma Nr.</strong> #${String(order.order_number).padStart(5, "0")}</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#444;">Ja maksājums jau bija veikts, atmaksa tiks veikta uz to pašu kontu 5–10 darba dienu laikā.</p>
    <p style="margin:24px 0 8px;color:#555;">Ja Tev ir jautājumi, atbildi uz šo e-pastu vai raksti mums uz <a href="mailto:info@t-bode.lv" style="color:#DC2626;">info@t-bode.lv</a>.</p>
    <p style="margin:0;color:#555;">— T-Bode komanda</p>
  </div>
</body></html>`;
}

export function renderContactReplyHtml(name = "Jānis"): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="${LOGO_URL}" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;">Paldies par ziņu!</h2>
    <p style="margin:0 0 16px;">Sveiki, ${name}!</p>
    <p style="margin:0 0 20px;line-height:1.5;">Paldies, ka sazinājies ar T-Bode! Esam saņēmuši Tavu ziņu un atbildēsim 1–2 darba dienu laikā.</p>
    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;color:#444;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">Tava ziņa:</p>
      <p style="margin:0;line-height:1.5;">Sveiki! Gribēju pajautāt par apdrukas termiņiem.</p>
    </div>
    <p style="margin:24px 0 8px;color:#555;">Steidzami jautājumi? Raksti mums uz info@t-bode.lv.</p>
    <p style="margin:0;color:#555;">— T-Bode komanda</p>
  </div>
</body></html>`;
}