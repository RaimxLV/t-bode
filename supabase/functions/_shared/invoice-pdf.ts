// Shared PDF invoice generator using pdf-lib (via npm:). Latvian-compliant tax invoice.
// Prices are VAT-inclusive (B2C standard). Net = gross / 1.21, VAT = gross - net.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export interface InvoiceBuyer {
  is_business: boolean;
  name: string;
  address?: string | null;
  reg_number?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface InvoiceSeller {
  company_name: string;
  company_reg_number?: string | null;
  company_vat_number?: string | null;
  company_address?: string | null;
  bank_name?: string | null;
  bank_iban?: string | null;
  bank_swift?: string | null;
  bank_beneficiary?: string | null;
  logo_url?: string | null;
  stamp_url?: string | null;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price_gross: number; // VAT inclusive
  size?: string | null;
  color?: string | null;
}

export interface InvoiceData {
  invoice_number: string;
  order_number: number | null;
  issue_date: string; // ISO
  due_date?: string | null; // ISO
  buyer: InvoiceBuyer;
  seller: InvoiceSeller;
  items: InvoiceItem[];
  shipping_gross?: number; // VAT-inclusive
  discount_gross?: number; // VAT-inclusive
  vat_rate?: number; // default 21
  notes?: string | null;
  payment_method?: string | null;
  version?: number;
}

export interface InvoiceTotals {
  net: number;
  vat: number;
  gross: number;
  vat_rate: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeTotals(data: InvoiceData): InvoiceTotals {
  const rate = data.vat_rate ?? 21;
  const itemsGross = data.items.reduce((s, it) => s + it.unit_price_gross * it.quantity, 0);
  const gross = round2(itemsGross + (data.shipping_gross ?? 0) - (data.discount_gross ?? 0));
  const net = round2(gross / (1 + rate / 100));
  const vat = round2(gross - net);
  return { net, vat, gross, vat_rate: rate };
}

// Latin-1 safe text (pdf-lib standard fonts don't support Unicode by default).
// Fold common LV diacritics to ASCII, drop anything else outside Latin-1.
function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  const map: Record<string, string> = {
    "ā": "a", "Ā": "A", "č": "c", "Č": "C", "ē": "e", "Ē": "E",
    "ģ": "g", "Ģ": "G", "ī": "i", "Ī": "I", "ķ": "k", "Ķ": "K",
    "ļ": "l", "Ļ": "L", "ņ": "n", "Ņ": "N", "š": "s", "Š": "S",
    "ū": "u", "Ū": "U", "ž": "z", "Ž": "Z",
    "€": "EUR",
  };
  let out = "";
  for (const ch of s) {
    if (map[ch]) { out += map[ch]; continue; }
    const code = ch.charCodeAt(0);
    if (code <= 0xff) out += ch;
    else out += "?";
  }
  return out;
}

async function tryEmbedImage(pdf: PDFDocument, url?: string | null) {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    const ct = resp.headers.get("content-type") ?? "";
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return await pdf.embedPng(buf);
    if (ct.includes("jpeg") || ct.includes("jpg") || /\.jpe?g$/i.test(url)) return await pdf.embedJpg(buf);
    try { return await pdf.embedPng(buf); } catch { return await pdf.embedJpg(buf); }
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(data: InvoiceData): Promise<{ bytes: Uint8Array; totals: InvoiceTotals }> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  const colorText = rgb(0.1, 0.1, 0.12);
  const colorMuted = rgb(0.45, 0.45, 0.5);
  const colorAccent = rgb(0.86, 0.15, 0.15); // brand red
  const colorLine = rgb(0.85, 0.85, 0.88);

  const totals = computeTotals(data);

  // === Header ===
  const logo = await tryEmbedImage(pdf, data.seller.logo_url);
  let y = height - 50;
  if (logo) {
    const logoH = 40;
    const logoW = (logo.width / logo.height) * logoH;
    page.drawImage(logo, { x: marginX, y: y - logoH + 8, width: logoW, height: logoH });
  } else {
    page.drawText(sanitize(data.seller.company_name), {
      x: marginX, y, size: 16, font: bold, color: colorText,
    });
  }

  // Invoice title box (right side)
  page.drawText("RECINS / INVOICE", {
    x: width - marginX - 180, y, size: 16, font: bold, color: colorAccent,
  });
  page.drawText(`Nr. ${sanitize(data.invoice_number)}`, {
    x: width - marginX - 180, y: y - 20, size: 11, font: bold, color: colorText,
  });
  const issue = new Date(data.issue_date);
  page.drawText(`Datums: ${issue.toLocaleDateString("lv-LV")}`, {
    x: width - marginX - 180, y: y - 36, size: 9, font, color: colorMuted,
  });
  if (data.order_number != null) {
    page.drawText(`Pasutijuma Nr.: #${String(data.order_number).padStart(4, "0")}`, {
      x: width - marginX - 180, y: y - 50, size: 9, font, color: colorMuted,
    });
  }
  if ((data.version ?? 1) > 1) {
    page.drawText(`Versija: v${data.version}`, {
      x: width - marginX - 180, y: y - 64, size: 9, font, color: colorMuted,
    });
  }

  y -= 80;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: colorLine });
  y -= 16;

  // === Parties ===
  const colW = (width - marginX * 2 - 20) / 2;
  const leftX = marginX;
  const rightX = marginX + colW + 20;

  page.drawText("PARDEVEJS", { x: leftX, y, size: 8, font: bold, color: colorMuted });
  page.drawText("PIRCEJS", { x: rightX, y, size: 8, font: bold, color: colorMuted });
  y -= 14;

  const seller = data.seller;
  const sellerLines = [
    seller.company_name,
    seller.company_reg_number ? `Reg. Nr.: ${seller.company_reg_number}` : null,
    seller.company_vat_number ? `PVN Nr.: ${seller.company_vat_number}` : null,
    seller.company_address,
  ].filter(Boolean) as string[];

  const buyer = data.buyer;
  const buyerLines = [
    buyer.name,
    buyer.is_business && buyer.reg_number ? `Reg. Nr.: ${buyer.reg_number}` : null,
    buyer.is_business && buyer.vat_number ? `PVN Nr.: ${buyer.vat_number}` : null,
    buyer.address,
    buyer.email,
    buyer.phone,
  ].filter(Boolean) as string[];

  const maxLines = Math.max(sellerLines.length, buyerLines.length);
  for (let i = 0; i < maxLines; i++) {
    const s = sellerLines[i];
    const b = buyerLines[i];
    if (s) page.drawText(sanitize(s), { x: leftX, y, size: 9.5, font: i === 0 ? bold : font, color: colorText });
    if (b) page.drawText(sanitize(b), { x: rightX, y, size: 9.5, font: i === 0 ? bold : font, color: colorText });
    y -= 13;
  }

  y -= 12;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: colorLine });
  y -= 18;

  // === Items table ===
  const tableX = marginX;
  const tableW = width - marginX * 2;
  const colDescW = tableW - 60 - 70 - 80 - 80;
  const colQtyX = tableX + colDescW;
  const colPriceX = tableX + colDescW + 60;
  const colNetX = tableX + colDescW + 60 + 80;
  const colTotalX = tableX + colDescW + 60 + 80 + 80;

  page.drawRectangle({ x: tableX, y: y - 4, width: tableW, height: 18, color: rgb(0.96, 0.96, 0.97) });
  page.drawText("Apraksts", { x: tableX + 4, y, size: 9, font: bold, color: colorText });
  page.drawText("Skaits", { x: colQtyX, y, size: 9, font: bold, color: colorText });
  page.drawText("Cena (ar PVN)", { x: colPriceX, y, size: 9, font: bold, color: colorText });
  page.drawText("Neto", { x: colNetX, y, size: 9, font: bold, color: colorText });
  page.drawText("Summa", { x: colTotalX, y, size: 9, font: bold, color: colorText });
  y -= 18;

  const rate = totals.vat_rate;
  for (const it of data.items) {
    const lineGross = round2(it.unit_price_gross * it.quantity);
    const lineNet = round2(lineGross / (1 + rate / 100));
    let desc = it.name;
    const extras = [it.size, it.color].filter(Boolean).join(" / ");
    if (extras) desc += ` (${extras})`;
    const descSan = sanitize(desc);
    // Truncate if too long
    const maxChars = 48;
    const descShort = descSan.length > maxChars ? descSan.slice(0, maxChars - 1) + "..." : descSan;
    page.drawText(descShort, { x: tableX + 4, y, size: 9, font, color: colorText });
    page.drawText(String(it.quantity), { x: colQtyX, y, size: 9, font, color: colorText });
    page.drawText(it.unit_price_gross.toFixed(2), { x: colPriceX, y, size: 9, font, color: colorText });
    page.drawText(lineNet.toFixed(2), { x: colNetX, y, size: 9, font, color: colorText });
    page.drawText(lineGross.toFixed(2), { x: colTotalX, y, size: 9, font, color: colorText });
    y -= 14;
    if (y < 200) break; // safety; multi-page not required for typical orders
  }

  if (data.shipping_gross && data.shipping_gross > 0) {
    const s = round2(data.shipping_gross);
    page.drawText("Piegade", { x: tableX + 4, y, size: 9, font, color: colorText });
    page.drawText("1", { x: colQtyX, y, size: 9, font, color: colorText });
    page.drawText(s.toFixed(2), { x: colPriceX, y, size: 9, font, color: colorText });
    page.drawText(round2(s / (1 + rate / 100)).toFixed(2), { x: colNetX, y, size: 9, font, color: colorText });
    page.drawText(s.toFixed(2), { x: colTotalX, y, size: 9, font, color: colorText });
    y -= 14;
  }
  if (data.discount_gross && data.discount_gross > 0) {
    const d = round2(data.discount_gross);
    page.drawText("Atlaide", { x: tableX + 4, y, size: 9, font, color: colorAccent });
    page.drawText(`-${d.toFixed(2)}`, { x: colTotalX, y, size: 9, font, color: colorAccent });
    y -= 14;
  }

  y -= 6;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: colorLine });
  y -= 20;

  // === Totals summary (right aligned block) ===
  const sumX = width - marginX - 200;
  const sumValX = width - marginX - 60;
  page.drawText(`Summa bez PVN (neto):`, { x: sumX, y, size: 10, font, color: colorText });
  page.drawText(`${totals.net.toFixed(2)} EUR`, { x: sumValX, y, size: 10, font, color: colorText });
  y -= 14;
  page.drawText(`PVN ${rate}%:`, { x: sumX, y, size: 10, font, color: colorText });
  page.drawText(`${totals.vat.toFixed(2)} EUR`, { x: sumValX, y, size: 10, font, color: colorText });
  y -= 14;
  page.drawRectangle({ x: sumX - 6, y: y - 4, width: 260, height: 20, color: rgb(0.96, 0.96, 0.97) });
  page.drawText(`APMAKSAI (bruto):`, { x: sumX, y, size: 11, font: bold, color: colorText });
  page.drawText(`${totals.gross.toFixed(2)} EUR`, { x: sumValX, y, size: 11, font: bold, color: colorAccent });
  y -= 28;

  // === Payment details ===
  if (seller.bank_iban) {
    page.drawText("APMAKSAS REKVIZITI", { x: marginX, y, size: 8, font: bold, color: colorMuted });
    y -= 12;
    const rows = [
      seller.bank_beneficiary ? `Sanemejs: ${seller.bank_beneficiary}` : null,
      seller.bank_name ? `Banka: ${seller.bank_name}` : null,
      seller.bank_iban ? `IBAN: ${seller.bank_iban}` : null,
      seller.bank_swift ? `SWIFT: ${seller.bank_swift}` : null,
      `Maksajuma merkis: ${data.invoice_number}`,
    ].filter(Boolean) as string[];
    for (const r of rows) {
      page.drawText(sanitize(r), { x: marginX, y, size: 9, font, color: colorText });
      y -= 12;
    }
    y -= 6;
  }

  // === Notes ===
  if (data.notes && data.notes.trim()) {
    page.drawText("PIEZIMES", { x: marginX, y, size: 8, font: bold, color: colorMuted });
    y -= 12;
    const noteLines = sanitize(data.notes).match(/.{1,90}(\s|$)/g) ?? [data.notes];
    for (const line of noteLines.slice(0, 6)) {
      page.drawText(line.trim(), { x: marginX, y, size: 9, font, color: colorText });
      y -= 12;
    }
    y -= 6;
  }

  // === Footer ===
  page.drawLine({ start: { x: marginX, y: 48 }, end: { x: width - marginX, y: 48 }, thickness: 0.5, color: colorLine });
  page.drawText(
    sanitize(`${seller.company_name}${seller.company_reg_number ? ` · Reg. ${seller.company_reg_number}` : ""}${seller.company_vat_number ? ` · PVN ${seller.company_vat_number}` : ""}`),
    { x: marginX, y: 36, size: 8, font, color: colorMuted }
  );
  page.drawText(sanitize("Dokuments sagatavots elektroniski un ir derīgs bez paraksta."), {
    x: marginX, y: 24, size: 7.5, font, color: colorMuted,
  });

  const bytes = await pdf.save();
  return { bytes, totals };
}