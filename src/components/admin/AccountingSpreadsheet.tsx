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

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-green-50 dark:bg-green-950/30",
  pending: "bg-yellow-50 dark:bg-yellow-950/30",
  cancelled: "bg-red-50 dark:bg-red-950/30",
  refunded: "bg-red-50 dark:bg-red-950/30",
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
        const productsStr = its.length
          ? its.map((it) => {
              const variant = [it.color, it.size].filter(Boolean).join(" / ");
              const qty = (it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : "";
              return `${it.product_name}${variant ? ` (${variant})` : ""}${qty}`;
            }).join("; ")
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
    const r = rows.filter((x) => !x.isGroupHeader && x.status === "paid");
    return {
      net: r.reduce((s, x) => s + x.net, 0),
      vat: r.reduce((s, x) => s + x.vat, 0),
      gross: r.reduce((s, x) => s + x.gross, 0),
      count: r.length,
    };
  }, [rows]);

  const columns: ColumnDef<Row>[] = useMemo(() => [
    { accessorKey: "date", header: "Datums" },
    { accessorKey: "orderNumber", header: "Pas. Nr." },
    { accessorKey: "invoiceNumber", header: "Rēķina Nr." },
    { accessorKey: "client", header: "Klients/Uzņēmums" },
    { accessorKey: "products", header: "Preces", cell: (i) => (
      <span className="block max-w-[360px] whitespace-normal text-xs">{i.getValue() as string}</span>
    ) },
    { accessorKey: "regNumber", header: "Reģ. nr." },
    { accessorKey: "vatNumber", header: "PVN nr." },
    { accessorKey: "net", header: "Bez PVN", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "vat", header: "PVN 21%", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "gross", header: "Kopsumma", cell: (i) => (i.row.original.isGroupHeader ? "" : `${(i.getValue() as number).toFixed(2)} €`) },
    { accessorKey: "paymentMethod", header: "Maks. veids" },
    { accessorKey: "status", header: "Statuss" },
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
      const fill =
        r.status === "paid" ? "FFD1FAE5"
        : r.status === "pending" ? "FFFEF3C7"
        : (r.status === "cancelled" || r.status === "refunded") ? "FFFEE2E2"
        : null;
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
        <table className="w-full text-xs sm:text-sm border-collapse select-text">
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="text-left font-medium px-2 py-2 border-b border-border whitespace-nowrap">
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
                return (
                  <tr key={row.id} className="bg-muted/60">
                    <td colSpan={columns.length} className="px-2 py-1.5 font-display text-foreground/80 text-xs uppercase tracking-wide">
                      {r.groupLabel}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={row.id} className={`${STATUS_COLOR[r.status] ?? ""} hover:bg-muted/40`}>
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-2 py-1.5 border-b border-border/40 whitespace-nowrap">
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