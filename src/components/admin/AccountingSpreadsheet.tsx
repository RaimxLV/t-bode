import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

type Row = {
  date: string;
  orderNumber: string;
  invoiceNumber: string;
  client: string;
  products: string;
  productItems?: { name: string; variant: string; qty: number }[];
  regNumber: string;
  vatNumber: string;
  net: number;
  vat: number;
  gross: number;
  paymentMethod: string;
  status: string;
  isGroupHeader?: boolean;
  groupLabel?: string;
};

// Statuses that count as "sold" (revenue earned)
const PAID_STATUSES = new Set(["paid", "processing", "confirmed", "shipped", "delivered", "completed"]);
const PENDING_STATUSES = new Set(["pending", "awaiting_payment"]);
const CANCELLED_STATUSES = new Set(["cancelled", "refunded", "failed"]);

const statusBucket = (s: string): "paid" | "pending" | "cancelled" | "other" => {
  if (PAID_STATUSES.has(s)) return "paid";
  if (PENDING_STATUSES.has(s)) return "pending";
  if (CANCELLED_STATUSES.has(s)) return "cancelled";
  return "other";
};

const ROW_TINT: Record<string, string> = {
  paid: "bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500",
  pending: "bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-l-amber-500",
  cancelled: "bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-l-rose-500 line-through opacity-70",
  other: "border-l-4 border-l-transparent",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  paid: { label: "Apmaksāts", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  pending: { label: "Gaida", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  cancelled: { label: "Atcelts", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  other: { label: "—", cls: "bg-muted text-muted-foreground border-border" },
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const names = ["Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs", "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris"];
  return `${y} ${names[m - 1]}`;
};

export const AccountingSpreadsheet = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ordersRes, invoicesRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("invoices").select("invoice_number, order_id, net_amount, vat_amount, gross_amount, vat_rate, is_current"),
        supabase.from("order_items").select("order_id, product_name, quantity, size, color"),
      ]);
      if (ordersRes.error) toast.error("Neizdevās ielādēt pasūtījumus");
      else setOrders(ordersRes.data || []);
      if (!invoicesRes.error) setInvoices(invoicesRes.data || []);
      if (!itemsRes.error) setItems(itemsRes.data || []);
      setLoading(false);
    })();
  }, []);

  const months = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(monthKey(new Date(o.created_at))));
    const list = Array.from(set).sort().reverse();
    if (list.length === 0) list.push(monthKey(new Date()));
    return list;
  }, [orders]);

  useEffect(() => {
    if (!activeMonth && months.length) setActiveMonth(months[0]);
  }, [months, activeMonth]);

  const invoiceByOrder = useMemo(() => {
    const m = new Map<string, any>();
    invoices.filter((i) => i.is_current).forEach((i) => m.set(i.order_id, i));
    return m;
  }, [invoices]);

  const itemsByOrder = useMemo(() => {
    const m = new Map<string, any[]>();
    items.forEach((it) => {
      if (!m.has(it.order_id)) m.set(it.order_id, []);
      m.get(it.order_id)!.push(it);
    });
    return m;
  }, [items]);

  const rows: Row[] = useMemo(() => {
    const monthOrders = orders
      .filter((o) => monthKey(new Date(o.created_at)) === activeMonth)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const byDay = new Map<string, any[]>();
    monthOrders.forEach((o) => {
      const d = new Date(o.created_at).toLocaleDateString("lv-LV");
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(o);
    });

    const out: Row[] = [];
    for (const [day, list] of byDay) {
      out.push({
        date: day, orderNumber: "", invoiceNumber: "", client: "", products: "", regNumber: "",
        vatNumber: "", net: 0, vat: 0, gross: 0, paymentMethod: "", status: "",
        isGroupHeader: true, groupLabel: day,
      });
      list.forEach((o) => {
        const inv = invoiceByOrder.get(o.id);
        const its = itemsByOrder.get(o.id) ?? [];
        const productItems = its.map((it) => ({
          name: String(it.product_name ?? "—"),
          variant: [it.color, it.size].filter(Boolean).join(" / "),
          qty: Number(it.quantity ?? 1),
        }));
        const productsStr = its.length
          ? its.map((it) => {
              const variant = [it.color, it.size].filter(Boolean).join(" / ");
              const qty = (it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : ` ×1`;
              return `• ${it.product_name}${variant ? ` (${variant})` : ""}${qty}`;
            }).join("\n")
          : "—";
        const gross = Number(o.total ?? 0);
        const vatRate = Number(inv?.vat_rate ?? 21);
        const net = inv?.net_amount != null ? Number(inv.net_amount) : +(gross / (1 + vatRate / 100)).toFixed(2);
        const vat = inv?.vat_amount != null ? Number(inv.vat_amount) : +(gross - net).toFixed(2);
        out.push({
          date: new Date(o.created_at).toLocaleDateString("lv-LV"),
          orderNumber: o.order_number != null ? `TB-${String(o.order_number).padStart(5, "0")}` : "—",
          invoiceNumber: inv?.invoice_number ?? "—",
          client: o.is_business
            ? (o.company_name ?? o.shipping_name ?? "—")
            : (o.shipping_name ?? o.guest_email ?? "—"),
          products: productsStr,
          productItems,
          regNumber: o.company_reg_number ?? "",
          vatNumber: o.company_vat_number ?? "",
          net,
          vat,
          gross,
          paymentMethod: o.payment_method ?? "",
          status: o.status ?? "",
        });
      });
    }
    return out;
  }, [orders, activeMonth, invoiceByOrder, itemsByOrder]);

  const totals = useMemo(() => {
    const r = rows.filter((x) => !x.isGroupHeader && statusBucket(x.status) === "paid");
    return {
      net: r.reduce((s, x) => s + x.net, 0),
      vat: r.reduce((s, x) => s + x.vat, 0),
      gross: r.reduce((s, x) => s + x.gross, 0),
      count: r.length,
    };
  }, [rows]);

  // Daily totals (paid bucket) for the group header rows
  const dayTotals = useMemo(() => {
    const m = new Map<string, { net: number; vat: number; gross: number; count: number }>();
    rows.filter((r) => !r.isGroupHeader && statusBucket(r.status) === "paid").forEach((r) => {
      const t = m.get(r.date) ?? { net: 0, vat: 0, gross: 0, count: 0 };
      t.net += r.net; t.vat += r.vat; t.gross += r.gross; t.count += 1;
      m.set(r.date, t);
    });
    return m;
  }, [rows]);

  const columns: ColumnDef<Row>[] = useMemo(() => [
    { accessorKey: "date", header: "Datums" },
    { accessorKey: "orderNumber", header: "Pas. Nr." },
    { accessorKey: "invoiceNumber", header: "Rēķina Nr." },
    { accessorKey: "client", header: "Klients/Uzņēmums" },
    { accessorKey: "products", header: "Preces", cell: (i) => {
      const list = i.row.original.productItems;
      if (!list || list.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <ul className="space-y-1 min-w-[260px] max-w-[420px] text-xs leading-snug">
          {list.map((it, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-muted-foreground select-none">•</span>
              <span className="flex-1">
                <span className="font-medium">{it.name}</span>
                {it.variant && (
                  <span className="ml-1 inline-block whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {it.variant}
                  </span>
                )}
                <span className="ml-1 whitespace-nowrap text-muted-foreground">×{it.qty}</span>
              </span>
            </li>
          ))}
        </ul>
      );
    } },
    { accessorKey: "regNumber", header: "Reģ. nr." },
    { accessorKey: "vatNumber", header: "PVN nr." },
    { accessorKey: "net", header: "Bez PVN", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "vat", header: "PVN 21%", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "gross", header: "Kopsumma", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "paymentMethod", header: "Maks. veids" },
    { accessorKey: "status", header: "Statuss", cell: (i) => {
      const b = statusBucket(i.getValue() as string);
      const badge = STATUS_BADGE[b];
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide ${badge.cls}`}>
          {badge.label}
        </span>
      );
    } },
  ], []);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  const exportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(monthLabel(activeMonth));
    ws.columns = [
      { header: "Datums", key: "date", width: 12 },
      { header: "Pas. Nr.", key: "orderNumber", width: 14 },
      { header: "Rēķina Nr.", key: "invoiceNumber", width: 16 },
      { header: "Klients", key: "client", width: 30 },
      { header: "Preces", key: "products", width: 50 },
      { header: "Reģ. nr.", key: "regNumber", width: 14 },
      { header: "PVN nr.", key: "vatNumber", width: 14 },
      { header: "Bez PVN (€)", key: "net", width: 12 },
      { header: "PVN 21% (€)", key: "vat", width: 12 },
      { header: "Kopsumma (€)", key: "gross", width: 12 },
      { header: "Maks. veids", key: "paymentMethod", width: 14 },
      { header: "Statuss", key: "status", width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.filter((r) => !r.isGroupHeader).forEach((r) => {
      const row = ws.addRow(r);
      row.getCell("products").alignment = { wrapText: true, vertical: "top" };
      const b = statusBucket(r.status);
      const fill = b === "paid" ? "FFD1FAE5" : b === "pending" ? "FFFEF3C7" : b === "cancelled" ? "FFFEE2E2" : null;
      if (fill) row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; });
    });
    ws.addRow({});
    const tot = ws.addRow({ client: "KOPĀ (apmaksāts):", net: totals.net, vat: totals.vat, gross: totals.gross });
    tot.font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `T-Bode_${activeMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-muted-foreground text-center py-12 font-body">Ielādē...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-display">Grāmatvedība</h2>
        </div>
        <Button onClick={exportXlsx} className="bg-primary text-primary-foreground">
          <Download className="w-4 h-4 mr-2" /> Lejupielādēt .xlsx
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Apmaksāti pasūt.</p>
          <p className="text-xl font-display">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Bez PVN</p>
          <p className="text-xl font-display">{totals.net.toFixed(2)} €</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">PVN 21%</p>
          <p className="text-xl font-display">{totals.vat.toFixed(2)} €</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-primary/5">
          <p className="text-xs text-muted-foreground">Kopsumma</p>
          <p className="text-xl font-display">{totals.gross.toFixed(2)} €</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-auto bg-card">
        <table className="w-full text-[10px] sm:text-[11px] border-collapse select-text">
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="text-left font-medium px-1.5 py-1.5 border-b border-border whitespace-nowrap text-[10px] uppercase tracking-wide">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const r = row.original;
              if (r.isGroupHeader) {
                const dt = dayTotals.get(r.groupLabel ?? r.date);
                return (
                  <tr key={row.id} className="bg-primary/10 border-y-2 border-primary/30">
                    <td colSpan={columns.length} className="px-3 py-2 font-display text-foreground text-xs uppercase tracking-widest">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                          {r.groupLabel}
                        </span>
                        {dt && (
                          <span className="flex flex-wrap items-center gap-3 normal-case tracking-normal text-[11px] font-body text-muted-foreground">
                            <span>{dt.count} pas.</span>
                            <span>Bez PVN: <b className="text-foreground">{dt.net.toFixed(2)} €</b></span>
                            <span>PVN: <b className="text-foreground">{dt.vat.toFixed(2)} €</b></span>
                            <span>Kopā: <b className="text-primary">{dt.gross.toFixed(2)} €</b></span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
              const tint = ROW_TINT[statusBucket(r.status)];
              return (
                <tr key={row.id} className={`${tint} hover:bg-muted/40 transition-colors`}>
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-1.5 py-1 border-b border-border/40 whitespace-nowrap">
                      {flexRender(c.column.columnDef.cell, c.getContext()) as any}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Nav datu šim mēnesim.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Tabs value={activeMonth} onValueChange={setActiveMonth}>
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 p-1">
          {months.map((m) => (
            <TabsTrigger key={m} value={m} className="text-xs">{monthLabel(m)}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        💡 Iezīmē šūnas ar peli un nospied <kbd className="px-1.5 py-0.5 rounded border bg-muted">Ctrl+C</kbd> lai kopētu uz Excel.
      </p>
    </div>
  );
};