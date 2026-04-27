import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Euro, Receipt, TrendingUp, CreditCard, Package, FileSpreadsheet, Eye, CalendarIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
const InvoiceModal = lazy(() => import("./InvoiceModal").then((m) => ({ default: m.InvoiceModal })));

const VAT_RATE = 21;
const round2 = (n: number) => Math.round(n * 100) / 100;

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export const ReportsManager = () => {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO(0));
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [invoicesByOrder, setInvoicesByOrder] = useState<Record<string, any>>({});
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromISO = new Date(from + "T00:00:00").toISOString();
    const toDate = new Date(to + "T23:59:59.999").toISOString();
    // Strategy: load orders + invoices broadly, then filter client-side by chosen date field.
    // We always include orders with confirmed/processing/shipped/delivered/manually-paid.
    // Pending / cancelled are EXCLUDED unless an invoice was issued (B2B credit-note scenarios).
    try {
      // 1) Pull current invoices in the period (covers cancelled-with-invoice cases too).
      const { data: invsInRange } = await supabase
        .from("invoices")
        .select("order_id, invoice_number, version, gross_amount, net_amount, vat_amount, is_current, created_at")
        .eq("is_current", true)
        .gte("created_at", fromISO).lte("created_at", toDate);

      // 2) Pull orders in the period (by created_at OR manually_paid_at).
      // We use OR to capture both order-date and paid-date matches in one query.
      const orFilter = `and(created_at.gte.${fromISO},created_at.lte.${toDate}),and(manually_paid_at.gte.${fromISO},manually_paid_at.lte.${toDate})`;
      const { data: ordersInRange, error: ordErr } = await supabase
        .from("orders").select("*")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (ordErr) throw ordErr;

      // 3) Merge: union of order IDs from invoices + orders in range, then fetch any missing orders.
      const orderIdSet = new Set<string>((ordersInRange ?? []).map((o: any) => o.id));
      const missingFromInvoices = (invsInRange ?? [])
        .map((i: any) => i.order_id)
        .filter((id: string) => !orderIdSet.has(id));
      let extraOrders: any[] = [];
      if (missingFromInvoices.length) {
        const { data: extra } = await supabase.from("orders").select("*").in("id", missingFromInvoices);
        extraOrders = extra ?? [];
      }
      const allOrders = [...(ordersInRange ?? []), ...extraOrders];

      // 4) Build invoice map for ALL these orders (need data for warnings, even if invoice is outside range).
      const allOrderIds = allOrders.map((o) => o.id);
      let invMap: Record<string, any> = {};
      let itemsData: any[] = [];
      if (allOrderIds.length) {
        const [{ data: invs }, { data: its }] = await Promise.all([
          supabase
            .from("invoices")
            .select("order_id, invoice_number, version, gross_amount, net_amount, vat_amount, is_current, created_at")
            .in("order_id", allOrderIds)
            .eq("is_current", true),
          supabase.from("order_items").select("*").in("order_id", allOrderIds),
        ]);
        for (const inv of invs ?? []) invMap[inv.order_id] = inv;
        itemsData = its ?? [];
      }

      setOrders(allOrders);
      setItems(itemsData);
      setInvoicesByOrder(invMap);
    } catch (e: any) {
      toast.error(e.message ?? "Kļūda ielādējot datus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Filter loaded data by chosen date field + inclusion rules.
  const filteredOrders = useMemo(() => {
    const fromMs = new Date(from + "T00:00:00").getTime();
    const toMs = new Date(to + "T23:59:59.999").getTime();
    const PAID_STATUSES = new Set(["confirmed", "processing", "shipped", "delivered"]);
    return orders.filter((o) => {
      const inv = invoicesByOrder[o.id];
      // Inclusion: paid status OR has invoice (covers cancelled-with-invoice). Exclude pending+cancelled w/o invoice.
      const isPaid = PAID_STATUSES.has(o.status) || !!o.manually_paid_at;
      if (!isPaid && !inv) return false;

      // Date filter — always by order created_at (filtering by other fields available in Excel export)
      const ts = new Date(o.created_at).getTime();
      return ts >= fromMs && ts <= toMs;
    });
  }, [orders, invoicesByOrder, from, to]);

  const summary = useMemo(() => {
    let gross = 0;
    const paymentSplit: Record<string, { count: number; gross: number }> = {};
    for (const o of filteredOrders) {
      const g = Number(o.total);
      gross += g;
      const key = o.payment_method || o.provider || "other";
      if (!paymentSplit[key]) paymentSplit[key] = { count: 0, gross: 0 };
      paymentSplit[key].count += 1;
      paymentSplit[key].gross += g;
    }
    const net = round2(gross / (1 + VAT_RATE / 100));
    const vat = round2(gross - net);
    const productMap = new Map<string, { name: string; qty: number; gross: number }>();
    const filteredOrderIds = new Set(filteredOrders.map((o) => o.id));
    for (const it of items) {
      if (!filteredOrderIds.has(it.order_id)) continue;
      const key = it.product_id || it.product_name;
      const prev = productMap.get(key) ?? { name: it.product_name, qty: 0, gross: 0 };
      prev.qty += Number(it.quantity);
      prev.gross += Number(it.unit_price) * Number(it.quantity);
      productMap.set(key, prev);
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
    return { gross: round2(gross), net, vat, paymentSplit, products, orderCount: filteredOrders.length };
  }, [filteredOrders, items]);

  const itemsByOrder = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of items) {
      const arr = m.get(it.order_id) ?? [];
      arr.push(it);
      m.set(it.order_id, arr);
    }
    return m;
  }, [items]);

  const paymentLabel = (o: any) => {
    const k = (o.payment_method || o.provider || "").toLowerCase();
    if (k.includes("bank")) return "Pārskaitījums";
    if (k.includes("montonio")) return "Montonio";
    if (k.includes("stripe") || k.includes("card")) return "Karte";
    return o.payment_method || o.provider || "—";
  };

  const statusBadge = (o: any) => {
    const paid = o.manually_paid_at || ["confirmed", "processing", "shipped", "delivered"].includes(o.status);
    return paid ? (
      <Badge className="text-[10px]">Apmaksāts</Badge>
    ) : (
      <Badge variant="outline" className="text-[10px]">Gaida</Badge>
    );
  };

  const invoiceWarning = (o: any): string | null => {
    const inv = invoicesByOrder[o.id];
    if (!inv) return "Nav izrakstīts rēķins";
    if (Math.abs(Number(inv.gross_amount) - Number(o.total)) > 0.02) {
      return `Rēķina summa (${Number(inv.gross_amount).toFixed(2)} €) atšķiras no pasūtījuma (${Number(o.total).toFixed(2)} €)`;
    }
    return null;
  };

  const issuesCount = useMemo(
    () => filteredOrders.filter((o) => invoiceWarning(o)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredOrders, invoicesByOrder]
  );

  const openInvoicePdf = async (orderId: string) => {
    const inv = invoicesByOrder[orderId];
    if (!inv) {
      toast.error("Šim pasūtījumam nav izrakstīta rēķina");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fetchUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-pdf?order_id=${orderId}`;
      const resp = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      // Sanitize invoice number: keep only safe filename chars (alphanumerics, dash, underscore, dot)
      const rawNumber = String(inv.invoice_number ?? "").trim();
      const safeNumber = rawNumber.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^[._-]+|[._-]+$/g, "").slice(0, 80);
      // Sanitize version: must be a positive integer
      const versionNum = Number.parseInt(String(inv.version ?? ""), 10);
      const safeVersion = Number.isFinite(versionNum) && versionNum > 1 ? `_v${versionNum}` : "";
      const baseName = safeNumber || `order-${orderId.slice(0, 8)}`;
      const filename = `invoice-${baseName}${safeVersion}.pdf`;
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (e: any) {
      toast.error(`PDF kļūda: ${e.message}`);
    }
  };

  const exportXlsx = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "T-Bode";
    wb.created = new Date();
    const ws = wb.addWorksheet("Atskaite", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws.columns = [
      { header: "Datums", key: "date", width: 20 },
      { header: "Pasūtījuma Nr.", key: "order_no", width: 16 },
      { header: "Rēķina Nr.", key: "invoice_no", width: 16 },
      { header: "Klients", key: "client", width: 32 },
      { header: "Tips", key: "type", width: 8 },
      { header: "Reģ. Nr.", key: "reg_no", width: 16 },
      { header: "PVN Nr.", key: "vat_no", width: 16 },
      { header: "Maksājums", key: "payment", width: 16 },
      { header: "Statuss", key: "status", width: 14 },
      { header: "Bruto EUR", key: "gross", width: 14 },
      { header: "Neto EUR", key: "net", width: 14 },
      { header: "PVN EUR", key: "vat", width: 14 },
      { header: "PVN likme %", key: "vat_rate", width: 12 },
    ];

    // Header styling
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    header.alignment = { vertical: "middle", horizontal: "left" };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF374151" } },
        bottom: { style: "thin", color: { argb: "FF374151" } },
        left: { style: "thin", color: { argb: "FF374151" } },
        right: { style: "thin", color: { argb: "FF374151" } },
      };
    });

    for (const o of filteredOrders) {
      const gross = round2(Number(o.total));
      const net = round2(gross / (1 + VAT_RATE / 100));
      const vat = round2(gross - net);
      const inv = invoicesByOrder[o.id];
      ws.addRow({
        date: new Date(o.created_at),
        order_no: `#${String(o.order_number).padStart(4, "0")}`,
        invoice_no: inv ? `${inv.invoice_number}${inv.version > 1 ? ` v${inv.version}` : ""}` : "— nav —",
        client: o.is_business ? (o.company_name ?? "") : (o.shipping_name ?? ""),
        type: o.is_business ? "B2B" : "B2C",
        reg_no: o.company_reg_number ?? "",
        vat_no: o.company_vat_number ?? "",
        payment: paymentLabel(o),
        status: o.status,
        gross,
        net,
        vat,
        vat_rate: VAT_RATE / 100,
      });
    }

    // Number / date formats
    ws.getColumn("date").numFmt = "dd.mm.yyyy hh:mm";
    ws.getColumn("gross").numFmt = '#,##0.00 "€"';
    ws.getColumn("net").numFmt = '#,##0.00 "€"';
    ws.getColumn("vat").numFmt = '#,##0.00 "€"';
    ws.getColumn("vat_rate").numFmt = "0.00%";

    // Totals row
    const lastDataRow = ws.rowCount;
    if (lastDataRow > 1) {
      const totalsRow = ws.addRow({
        date: "",
        order_no: "",
        invoice_no: "",
        client: "KOPĀ",
        type: "",
        reg_no: "",
        vat_no: "",
        payment: "",
        status: "",
        gross: { formula: `SUM(J2:J${lastDataRow})` },
        net: { formula: `SUM(K2:K${lastDataRow})` },
        vat: { formula: `SUM(L2:L${lastDataRow})` },
        vat_rate: "",
      });
      totalsRow.font = { bold: true };
      totalsRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        cell.border = { top: { style: "medium", color: { argb: "FF1F2937" } } };
      });
      totalsRow.getCell("gross").numFmt = '#,##0.00 "€"';
      totalsRow.getCell("net").numFmt = '#,##0.00 "€"';
      totalsRow.getCell("vat").numFmt = '#,##0.00 "€"';
    }

    // Auto filter on header
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `atskaite_${from}_${to}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const setPreset = (days: number) => {
    setFrom(todayISO(-days + 1));
    setTo(todayISO(0));
  };

  const setThisMonth = () => {
    setFrom(monthStartISO());
    setTo(todayISO(0));
  };

  const setLastMonth = () => {
    const d = new Date();
    const firstThis = new Date(d.getFullYear(), d.getMonth(), 1);
    const firstPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastPrev = new Date(firstThis.getTime() - 24 * 3600 * 1000);
    setFrom(firstPrev.toISOString().slice(0, 10));
    setTo(lastPrev.toISOString().slice(0, 10));
  };

  const setThisYear = () => {
    const d = new Date();
    setFrom(`${d.getFullYear()}-01-01`);
    setTo(todayISO(0));
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">No</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full mt-1 justify-start text-left font-normal text-xs", !from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{from ? format(new Date(from), "dd.MM.yyyy") : "Izvēlies"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={from ? new Date(from) : undefined} onSelect={(d) => d && setFrom(d.toISOString().slice(0, 10))} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">Līdz</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full mt-1 justify-start text-left font-normal text-xs", !to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{to ? format(new Date(to), "dd.MM.yyyy") : "Izvēlies"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={to ? new Date(to) : undefined} onSelect={(d) => d && setTo(d.toISOString().slice(0, 10))} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Presets — horizontal scroll on mobile */}
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-1.5 px-1 min-w-max">
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setPreset(1); }}>Šodien</Button>
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setPreset(7); }}>7 d.</Button>
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={setThisMonth}>Šis mēnesis</Button>
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={setLastMonth}>Iepr. mēnesis</Button>
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={setThisYear}>Šis gads</Button>
            </div>
          </div>

          {/* Refresh + Export */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" onClick={load} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Ielādē..." : "Atsvaidzināt"}
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5" onClick={exportXlsx} disabled={!filteredOrders.length}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Eksportēt grāmatvedībai (Excel)
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Filtrē pēc pasūtījuma datuma. Excel eksportā pieejami papildu filtri (rēķina nr., klients, statuss, summa).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Package className="w-3.5 h-3.5" /> Pasūtījumi</div><p className="text-2xl font-display">{summary.orderCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Euro className="w-3.5 h-3.5" /> Neto</div><p className="text-2xl font-display">{summary.net.toFixed(2)} €</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Receipt className="w-3.5 h-3.5" /> PVN 21%</div><p className="text-2xl font-display">{summary.vat.toFixed(2)} €</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3.5 h-3.5" /> Bruto</div><p className="text-2xl font-display text-primary">{summary.gross.toFixed(2)} €</p></CardContent></Card>
      </div>

      {issuesCount > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-destructive">Uzmanību: {issuesCount} pasūtījumi ar rēķina problēmām</p>
            <p className="text-muted-foreground mt-0.5">Daži pasūtījumi nav rēķini izrakstīti vai rēķina summa atšķiras no pasūtījuma summas. Atver pavadzīmes (PDF) un ģenerē jaunu versiju.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Apmaksas veidu sadalījums</h3>
            {Object.keys(summary.paymentSplit).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nav datu</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(summary.paymentSplit).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{k}</Badge>
                      <span className="text-muted-foreground">{v.count} pas.</span>
                    </div>
                    <span className="font-semibold">{round2(v.gross).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Pārdotās preces</h3>
            {summary.products.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nav datu</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {summary.products.slice(0, 20).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <span className="truncate mr-2">{p.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">×{p.qty}</Badge>
                      <span className="font-semibold">{round2(p.gross).toFixed(2)} €</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={null}>
        <InvoiceModal
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          order={invoiceOrder}
        />
      </Suspense>
    </div>
  );
};