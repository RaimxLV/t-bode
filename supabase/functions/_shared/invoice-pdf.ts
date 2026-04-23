// Shared PDF invoice generator (PAVADZĪME) using pdf-lib + fontkit + Noto Sans
// for full Unicode (LV diacritic) support. Matches ERVITEX SIA paper layout.
// Prices are VAT-inclusive (B2C standard). Net = gross / 1.21, VAT = gross - net.
import { PDFDocument, PDFFont, PDFPage, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

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
  // Optional second bank account (e.g. Swedbank). Falls back to fixed defaults if absent.
  bank2_name?: string | null;
  bank2_iban?: string | null;
  bank2_swift?: string | null;
  // Issued by (signatory) name shown in footer
  issued_by_name?: string | null;
  // Tagline shown next to the logo (e.g. "PROMO APĢĒRBS UN APDRUKAS SERVISS")
  tagline?: string | null;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price_gross: number; // VAT inclusive
  size?: string | null;
  color?: string | null;
  sku?: string | null;     // Product code (e.g. STTU169_BLK_XL)
  unit?: string | null;    // Measurement unit (gab, m, kpl, ...)
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

// With Noto Sans (Unicode) we no longer need Latin-1 folding.
// Just normalise nullish values.
function s(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

// === Latvian number-to-words (for "Summa vārdiem") ===
const LV_ONES = [
  "nulle", "viens", "divi", "trīs", "četri", "pieci",
  "seši", "septiņi", "astoņi", "deviņi", "desmit",
  "vienpadsmit", "divpadsmit", "trīspadsmit", "četrpadsmit", "piecpadsmit",
  "sešpadsmit", "septiņpadsmit", "astoņpadsmit", "deviņpadsmit",
];
const LV_TENS = ["", "", "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit", "septiņdesmit", "astoņdesmit", "deviņdesmit"];

function lvHundreds(n: number): string {
  // 0..999
  if (n === 0) return "";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) {
    parts.push(h === 1 ? "viens simts" : `${LV_ONES[h]} simti`);
  }
  if (r > 0) {
    if (r < 20) parts.push(LV_ONES[r]);
    else {
      const t = Math.floor(r / 10);
      const o = r % 10;
      if (o === 0) parts.push(LV_TENS[t]);
      else parts.push(`${LV_TENS[t]} ${LV_ONES[o]}`);
    }
  }
  return parts.join(" ");
}

function lvIntegerWords(n: number): string {
  if (n === 0) return "nulle";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions > 0) {
    parts.push(`${lvHundreds(millions)} ${millions === 1 ? "miljons" : "miljoni"}`);
  }
  if (thousands > 0) {
    parts.push(`${lvHundreds(thousands)} ${thousands === 1 ? "tūkstotis" : "tūkstoši"}`);
  }
  if (rest > 0) parts.push(lvHundreds(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function amountToLatvianWords(amount: number): string {
  const rounded = Math.round(amount * 100);
  const euros = Math.floor(rounded / 100);
  const cents = rounded % 100;
  const eurWord = euros === 1 ? "euro" : "euro";
  const centWord = cents === 1 ? "cents" : "centi";
  const eurosText = lvIntegerWords(euros);
  const centsText = cents === 0 ? "nulle" : lvIntegerWords(cents);
  // Capitalise first letter
  const first = (eurosText.charAt(0).toUpperCase() + eurosText.slice(1));
  return `${first} ${eurWord} un ${centsText} ${centWord}`;
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

// Cache fonts across invocations within the same isolate.
let _cachedRegular: ArrayBuffer | null = null;
let _cachedBold: ArrayBuffer | null = null;

async function loadFont(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Font fetch failed: ${url} ${r.status}`);
  return await r.arrayBuffer();
}

async function getNotoFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (!_cachedRegular) {
    _cachedRegular = await loadFont(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-ext-400-normal.ttf",
    );
  }
  if (!_cachedBold) {
    _cachedBold = await loadFont(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-ext-700-normal.ttf",
    );
  }
  return { regular: _cachedRegular!, bold: _cachedBold! };
}

// ===== Drawing helpers =====
function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
) {
  page.drawText(s(text), { x, y, size, font, color });
}

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
) {
  const w = font.widthOfTextAtSize(s(text), size);
  page.drawText(s(text), { x: rightX - w, y, size, font, color });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = s(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Long word fallback: hard break
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        current = chunk;
      } else current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paymentMethodLv(method?: string | null): string {
  const m = (method ?? "").toLowerCase();
  if (m.includes("bank") || m.includes("transfer") || m.includes("parsk")) return "Pārskaitījums";
  if (m.includes("stripe") || m.includes("card")) return "Stripe (karte)";
  if (m.includes("montonio")) return "Montonio";
  return method || "Pārskaitījums";
}

export async function generateInvoicePdf(data: InvoiceData): Promise<{ bytes: Uint8Array; totals: InvoiceTotals }> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  // Embed Unicode-capable font (Noto Sans) for full LV diacritic support.
  let font: PDFFont;
  let bold: PDFFont;
  try {
    const { regular, bold: boldBuf } = await getNotoFonts();
    font = await pdf.embedFont(regular, { subset: true });
    bold = await pdf.embedFont(boldBuf, { subset: true });
  } catch (e) {
    // Fallback: should never trigger but keep PDF generation resilient.
    console.error("Noto Sans embed failed, falling back to Helvetica:", e);
    const { StandardFonts } = await import("npm:pdf-lib@1.17.1");
    font = await pdf.embedFont(StandardFonts.Helvetica);
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  }

  // === Layout constants ===
  const marginX = 40;
  const contentW = width - marginX * 2;
  const colorText = rgb(0.05, 0.05, 0.05);
  const colorMuted = rgb(0.35, 0.35, 0.4);
  const colorAccent = rgb(0.78, 0.12, 0.12); // brand red (ERVITEX)
  const colorLine = rgb(0, 0, 0);
  const colorLineSoft = rgb(0.7, 0.7, 0.72);

  const totals = computeTotals(data);
  const seller = data.seller;
  const buyer = data.buyer;

  // ============================================================
  // Date helpers
  // ============================================================
  const issue = new Date(data.issue_date);
  const monthsLv = ["janvāris","februāris","marts","aprīlis","maijs","jūnijs","jūlijs","augusts","septembris","oktobris","novembris","decembris"];
  const monthsLvLoc = ["janvārī","februārī","martā","aprīlī","maijā","jūnijā","jūlijā","augustā","septembrī","oktobrī","novembrī","decembrī"];
  const issueDateLv = `${issue.getFullYear()}. gada ${issue.getDate()}. ${monthsLv[issue.getMonth()]}`;
  const dueDate = data.due_date ? new Date(data.due_date) : new Date(issue.getTime() + 14 * 24 * 3600 * 1000);
  const dueDateLv = `${String(dueDate.getDate()).padStart(2, "0")}.${String(dueDate.getMonth() + 1).padStart(2, "0")}.${dueDate.getFullYear()}.`;
  const payMethodLv = paymentMethodLv(data.payment_method);

  // ============================================================
  // 1. HEADER STRIP — logo (left) + "PAVADZĪME" + meta (right)
  // ============================================================
  let y = height - 50;
  const logo = await tryEmbedImage(pdf, seller.logo_url);
  if (logo) {
    const logoH = 42;
    const logoW = Math.min(170, (logo.width / logo.height) * logoH);
    page.drawImage(logo, { x: marginX, y: y - logoH + 4, width: logoW, height: logoH });
  } else {
    drawText(page, seller.company_name.toUpperCase(), marginX, y - 22, bold, 24, colorAccent);
  }
  // Tagline below logo
  const tagline = seller.tagline ?? "PROMO APĢĒRBS UN APDRUKAS SERVISS";
  drawText(page, tagline, marginX, y - 50, font, 7, colorMuted);

  // Right side: PAVADZĪME title + Uzskaites Nr + date + lpp
  drawRight(page, "PAVADZĪME", width - marginX, y, bold, 18, colorText);
  drawRight(page, `Uzskaites Nr. ${data.invoice_number}`, width - marginX, y - 20, bold, 11, colorText);
  drawRight(page, issueDateLv, width - marginX, y - 36, font, 9, colorText);
  drawRight(page, "1 lpp.", width - marginX, y - 50, font, 8, colorMuted);

  y -= 70;

  // ============================================================
  // Drawing helpers for boxed sections
  // ============================================================
  const labelX = marginX + 8;
  const valueX = marginX + 135;
  const lineH = 12;
  const boxPadTop = 10;
  const boxPadBottom = 10;

  function drawBoxedSection(title: string, rows: Array<[string, string, boolean?]>, extraDrawer?: (innerY: number) => number): number {
    const rowsCount = rows.length;
    const extraH = extraDrawer ? 0 : 0; // extraDrawer manages its own height; we add via return value
    const innerH = rowsCount * lineH + (extraDrawer ? 14 : 0);
    const boxH = boxPadTop + innerH + boxPadBottom + 14; // +14 for title
    // Box border
    page.drawRectangle({
      x: marginX, y: y - boxH, width: contentW, height: boxH,
      borderColor: colorLine, borderWidth: 0.7, color: rgb(1, 1, 1),
    });
    // Title bar
    page.drawRectangle({
      x: marginX, y: y - 14, width: contentW, height: 14,
      color: rgb(0.93, 0.93, 0.94),
    });
    drawText(page, title, labelX, y - 10, bold, 9, colorText);
    let innerY = y - 14 - boxPadTop - 2;
    for (const [k, v, isBold] of rows) {
      drawText(page, k, labelX, innerY, font, 9, colorMuted);
      drawText(page, v, valueX, innerY, isBold ? bold : font, 9, colorText);
      innerY -= lineH;
    }
    if (extraDrawer) {
      innerY = extraDrawer(innerY);
    }
    y -= boxH + 6;
    return y;
  }

  // ============================================================
  // 2. SELLER BOX — "Preču nosūtītājs"
  // ============================================================
  const sellerRows: Array<[string, string, boolean?]> = [
    ["Nosaukums", seller.company_name ?? "", true],
    ["Juridiskā adrese", seller.company_address ?? "", false],
    ["Reģ. Nr. / PVN Nr.", `${seller.company_reg_number ?? ""}${seller.company_vat_number ? "  ·  " + seller.company_vat_number : ""}`, false],
  ];
  // Draw seller box with extra banking rows
  drawBoxedSection("Preču nosūtītājs", sellerRows, (innerY) => {
    // Bank 1
    drawText(page, "Banka", labelX, innerY, font, 9, colorMuted);
    if (seller.bank_name) {
      drawText(page, seller.bank_name, valueX, innerY, bold, 9, colorText);
      drawText(page, "SWIFT", valueX + 150, innerY, font, 8.5, colorMuted);
      drawText(page, seller.bank_swift ?? "", valueX + 185, innerY, bold, 8.5, colorText);
      drawText(page, "IBAN", valueX + 245, innerY, font, 8.5, colorMuted);
      drawText(page, seller.bank_iban ?? "", valueX + 275, innerY, bold, 8.5, colorText);
    }
    innerY -= lineH;
    // Bank 2 (Swedbank fallback)
    const bank2Name = seller.bank2_name ?? "Swedbank AS";
    const bank2Swift = seller.bank2_swift ?? "HABALV22";
    const bank2Iban = seller.bank2_iban ?? "LV94HABA0551004295328";
    drawText(page, "Banka", labelX, innerY, font, 9, colorMuted);
    drawText(page, bank2Name, valueX, innerY, bold, 9, colorText);
    drawText(page, "SWIFT", valueX + 150, innerY, font, 8.5, colorMuted);
    drawText(page, bank2Swift, valueX + 185, innerY, bold, 8.5, colorText);
    drawText(page, "IBAN", valueX + 245, innerY, font, 8.5, colorMuted);
    drawText(page, bank2Iban, valueX + 275, innerY, bold, 8.5, colorText);
    innerY -= lineH;
    return innerY;
  });

  // ============================================================
  // 3. BUYER BOX — "Preču saņēmējs"
  // ============================================================
  const buyerRows: Array<[string, string, boolean?]> = [
    ["Nosaukums", buyer.name ?? "", true],
    ["Reģ. Nr.", buyer.is_business ? (buyer.reg_number ?? "—") : "—", false],
    ["PVN Nr.", buyer.is_business ? (buyer.vat_number ?? "—") : "—", false],
    ["Adrese", buyer.address ?? "—", false],
    ["Piegādes adrese", buyer.address ?? "—", false],
    ["E-pasts / Tālrunis", `${buyer.email ?? ""}${buyer.phone ? "  ·  " + buyer.phone : ""}`, false],
  ];
  drawBoxedSection("Preču saņēmējs", buyerRows);

  // ============================================================
  // 4. TRANSACTION BOX — "Dati par darījumu"
  // ============================================================
  const txRows: Array<[string, string, boolean?]> = [
    ["Samaksas veids", payMethodLv, true],
    ["Samaksāt līdz", dueDateLv, true],
    ["Darījuma apraksts", "Piegāde (pārdošana)", false],
    ["Pasūtījuma Nr.", data.order_number ? String(data.order_number) : "—", false],
  ];
  drawBoxedSection("Dati par darījumu", txRows);

  // ============================================================
  // 5. ITEMS TABLE
  // ============================================================
  // Columns: Kods | Nosaukums | Daudz. | Mērv. | Cena | Summa
  const tableX = marginX;
  const tableW = contentW;
  const cKods = 70;
  const cName = tableW - cKods - 60 - 50 - 70 - 70; // flexible name column
  const cQty = 60;
  const cUnit = 50;
  const cPrice = 70;
  const cSum = 70;

  const xKods = tableX;
  const xName = xKods + cKods;
  const xQty = xName + cName;
  const xUnit = xQty + cQty;
  const xPrice = xUnit + cUnit;
  const xSum = xPrice + cPrice;
  const xEnd = xSum + cSum;

  // Header row with light background
  const headerH = 18;
  page.drawRectangle({ x: tableX, y: y - headerH + 4, width: tableW, height: headerH, color: rgb(0.93, 0.93, 0.94) });
  page.drawLine({ start: { x: tableX, y: y + 4 }, end: { x: xEnd, y: y + 4 }, thickness: 0.7, color: colorLine });
  page.drawLine({ start: { x: tableX, y: y - headerH + 4 }, end: { x: xEnd, y: y - headerH + 4 }, thickness: 0.7, color: colorLine });

  const headerY = y - 8;
  drawText(page, "Kods", xKods + 4, headerY, bold, 9, colorText);
  drawText(page, "Nosaukums", xName + 4, headerY, bold, 9, colorText);
  drawRight(page, "Daudz.", xUnit - 4, headerY, bold, 9, colorText);
  drawText(page, "Mērv.", xUnit + 4, headerY, bold, 9, colorText);
  drawRight(page, "Cena", xSum - 4, headerY, bold, 9, colorText);
  drawRight(page, "Summa", xEnd - 4, headerY, bold, 9, colorText);
  y -= headerH;

  const rate = totals.vat_rate;
  const rowH = 14;

  let totalQty = 0;
  let netSum = 0;

  for (const it of data.items) {
    const lineGross = round2(it.unit_price_gross * it.quantity);
    const lineNet = round2(lineGross / (1 + rate / 100));
    netSum += lineNet;
    totalQty += Number(it.quantity);

    // Description (name + variants)
    let desc = it.name;
    const extras = [it.size, it.color].filter(Boolean).join(", ");
    if (extras) desc += `, ${extras}`;
    const nameLines = wrapText(desc, font, 9, cName - 8);
    const linesUsed = Math.max(1, Math.min(nameLines.length, 2));

    drawText(page, it.sku ?? "", xKods + 4, y - 4, font, 9, colorText);
    for (let i = 0; i < linesUsed; i++) {
      drawText(page, nameLines[i], xName + 4, y - 4 - i * 11, font, 9, colorText);
    }
    drawRight(page, fmtNum(it.quantity, it.quantity % 1 === 0 ? 0 : 1), xUnit - 4, y - 4, font, 9, colorText);
    drawText(page, it.unit ?? "gab", xUnit + 4, y - 4, font, 9, colorText);
    drawRight(page, fmtNum(it.unit_price_gross, 3), xSum - 4, y - 4, font, 9, colorText);
    drawRight(page, fmtNum(lineGross, 2), xEnd - 4, y - 4, font, 9, colorText);
    y -= rowH + (linesUsed - 1) * 11;

    if (y < 230) break; // safety; one-page layout per requirement
  }

  // Optional shipping line
  if (data.shipping_gross && data.shipping_gross > 0) {
    const shipGross = round2(data.shipping_gross);
    const shipNet = round2(shipGross / (1 + rate / 100));
    netSum += shipNet;
    totalQty += 1;
    drawText(page, "PIEG", xKods + 4, y - 4, font, 9, colorText);
    drawText(page, "Piegāde", xName + 4, y - 4, font, 9, colorText);
    drawRight(page, "1", xUnit - 4, y - 4, font, 9, colorText);
    drawText(page, "gab", xUnit + 4, y - 4, font, 9, colorText);
    drawRight(page, fmtNum(shipGross, 3), xSum - 4, y - 4, font, 9, colorText);
    drawRight(page, fmtNum(shipGross, 2), xEnd - 4, y - 4, font, 9, colorText);
    y -= rowH;
  }
  if (data.discount_gross && data.discount_gross > 0) {
    const d = round2(data.discount_gross);
    drawText(page, "ATL", xKods + 4, y - 4, font, 9, colorAccent);
    drawText(page, "Atlaide", xName + 4, y - 4, font, 9, colorAccent);
    drawRight(page, `-${fmtNum(d, 2)}`, xEnd - 4, y - 4, font, 9, colorAccent);
    y -= rowH;
  }

  // Bottom border of items table
  page.drawLine({ start: { x: tableX, y: y + 4 }, end: { x: xEnd, y: y + 4 }, thickness: 0.7, color: colorLine });
  y -= 4;

  // ============================================================
  // 7. TOTALS BLOCK (right-aligned)
  // ============================================================
  // KOPĀ row (qty)
  drawText(page, "KOPĀ", xName + 4, y - 4, bold, 9, colorText);
  drawRight(page, fmtNum(totalQty, totalQty % 1 === 0 ? 0 : 1), xUnit - 4, y - 4, bold, 9, colorText);
  drawRight(page, fmtNum(totals.gross, 2), xEnd - 4, y - 4, bold, 9, colorText);
  y -= 14;

  // PVN row
  drawText(page, `PVN ${rate}% no`, xName + 4, y - 4, font, 9, colorText);
  drawRight(page, fmtNum(totals.net, 2), xPrice - 4, y - 4, font, 9, colorText);
  drawRight(page, fmtNum(totals.vat, 2), xEnd - 4, y - 4, font, 9, colorText);
  y -= 14;

  // Pavisam apmaksai
  page.drawRectangle({ x: xName, y: y - 4, width: xEnd - xName, height: 16, color: rgb(0.95, 0.95, 0.96) });
  drawText(page, "Pavisam apmaksai:", xName + 4, y, bold, 10, colorText);
  drawRight(page, "EUR", xSum - 4, y, bold, 10, colorText);
  drawRight(page, fmtNum(totals.gross, 2), xEnd - 4, y, bold, 11, colorAccent);
  y -= 22;

  // ============================================================
  // 8. SUMMA VĀRDIEM
  // ============================================================
  drawText(page, "Summa vārdiem:", marginX, y, font, 9, colorText);
  const wordsLines = wrapText(amountToLatvianWords(totals.gross), bold, 9, contentW - 110);
  for (let i = 0; i < Math.min(wordsLines.length, 2); i++) {
    drawText(page, wordsLines[i], marginX + 100, y - i * 11, bold, 9, colorText);
  }
  y -= 12 + (Math.min(wordsLines.length, 2) - 1) * 11;

  // Notes (compact)
  if (data.notes && data.notes.trim()) {
    y -= 8;
    drawText(page, "Piezīmes:", marginX, y, bold, 9, colorMuted);
    y -= 12;
    const noteLines = wrapText(data.notes, font, 9, contentW);
    for (const line of noteLines.slice(0, 3)) {
      drawText(page, line, marginX, y, font, 9, colorText);
      y -= 11;
    }
  }

  // ============================================================
  // 9. SIGNATURE BLOCK (footer) — Izsniedza | Pieņēma (boxed)
  // ============================================================
  const sigBoxH = 95;
  const sigBoxY = 60; // bottom Y of box
  const sigTop = sigBoxY + sigBoxH;
  const colMid = marginX + contentW / 2;

  // Outer box + vertical separator
  page.drawRectangle({
    x: marginX, y: sigBoxY, width: contentW, height: sigBoxH,
    borderColor: colorLine, borderWidth: 0.7, color: rgb(1, 1, 1),
  });
  page.drawLine({
    start: { x: colMid, y: sigBoxY }, end: { x: colMid, y: sigTop },
    thickness: 0.5, color: colorLine,
  });

  // Optional stamp/signature image (left side, behind text)
  const stamp = await tryEmbedImage(pdf, seller.stamp_url);
  if (stamp) {
    const stH = 60;
    const stW = (stamp.width / stamp.height) * stH;
    page.drawImage(stamp, { x: marginX + 70, y: sigBoxY + 8, width: stW, height: stH, opacity: 0.85 });
  }

  const issuedBy = seller.issued_by_name ?? "Evita Nesterova";
  const issuedDateLong = `${issue.getFullYear()}. gada ${issue.getDate()}. ${monthsLvLoc[issue.getMonth()]}`;

  // Left: Izsniedza
  drawText(page, "Izsniedza:", marginX + 8, sigTop - 14, bold, 9, colorText);
  drawText(page, "Vārds, uzvārds", marginX + 8, sigTop - 30, font, 8.5, colorMuted);
  drawText(page, issuedBy, marginX + 80, sigTop - 30, bold, 9, colorText);
  drawText(page, issuedDateLong, marginX + 8, sigTop - 46, font, 8.5, colorText);
  drawText(page, "Paraksts:", marginX + 8, sigTop - 70, font, 8.5, colorMuted);
  page.drawLine({
    start: { x: marginX + 60, y: sigTop - 70 }, end: { x: colMid - 10, y: sigTop - 70 },
    thickness: 0.4, color: colorLineSoft,
  });
  drawText(page, "Z.v.", marginX + 8, sigTop - 86, font, 8.5, colorMuted);

  // Right: Pieņēma
  drawText(page, "Pieņēma:", colMid + 8, sigTop - 14, bold, 9, colorText);
  drawText(page, "Vārds, uzvārds", colMid + 8, sigTop - 30, font, 8.5, colorMuted);
  drawText(page, buyer.name ?? "", colMid + 80, sigTop - 30, bold, 9, colorText);
  drawText(page, "Datums:", colMid + 8, sigTop - 46, font, 8.5, colorMuted);
  page.drawLine({
    start: { x: colMid + 50, y: sigTop - 46 }, end: { x: width - marginX - 8, y: sigTop - 46 },
    thickness: 0.4, color: colorLineSoft,
  });
  drawText(page, "Paraksts:", colMid + 8, sigTop - 70, font, 8.5, colorMuted);
  page.drawLine({
    start: { x: colMid + 60, y: sigTop - 70 }, end: { x: width - marginX - 8, y: sigTop - 70 },
    thickness: 0.4, color: colorLineSoft,
  });
  drawText(page, "Z.v.", colMid + 8, sigTop - 86, font, 8.5, colorMuted);

  // ============================================================
  // 10. DOCUMENT FOOTER — electronic doc notice
  // ============================================================
  const electronicNotice = "Dokuments sagatavots elektroniski un ir derīgs bez paraksta";
  const noticeW = bold.widthOfTextAtSize(electronicNotice, 8);
  drawText(page, electronicNotice, (width - noticeW) / 2, sigBoxY - 14, bold, 8, colorMuted);

  drawText(
    page,
    `${seller.company_name}${seller.company_reg_number ? " · Reģ. " + seller.company_reg_number : ""}${seller.company_vat_number ? " · PVN " + seller.company_vat_number : ""}`,
    marginX, 28, font, 7, colorMuted,
  );
  if ((data.version ?? 1) > 1) {
    drawRight(page, `versija v${data.version}`, width - marginX, 28, font, 7, colorMuted);
  }

  const bytes = await pdf.save();
  return { bytes, totals };
}