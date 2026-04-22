import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Euro, Receipt, TrendingUp, CreditCard, Package, FileSpreadsheet, Eye, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
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

export const ReportsManager = () => {
  const [from, setFrom] = useState(todayISO(0));
  const [to, setTo] = useState(todayISO(0));
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromISO = new Date(from + "T00:00:00").toISOString();
    const toDate = new Date(to + "T23:59:59.999").toISOString();
    // Only count paid/confirmed+ orders, exclude pending and cancelled
    const { data: ordersData, error: ordErr } = await supabase
      .from("orders").select("*")
      .gte("created_at", fromISO).lte("created_at", toDate)
      .in("status", ["confirmed", "processing", "shipped", "delivered"])
      .order("created_at", { ascending: false });
    if (ordErr) { toast.error(ordErr.message); setLoading(false); return; }
    const ids = (ordersData ?? []).map((o) => o.id);
    let itemsData: any[] = [];
    if (ids.length) {
      const { data } = await supabase.from("order_items").select("*").in("order_id", ids);
      itemsData = data ?? [];
    }
    setOrders(ordersData ?? []);
    setItems(itemsData);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    let gross = 0;
    const paymentSplit: Record<string, { count: number; gross: number }> = {};
    for (const o of orders) {
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
    for (const it of items) {
      const key = it.product_id || it.product_name;
      const prev = productMap.get(key) ?? { name: it.product_name, qty: 0, gross: 0 };
      prev.qty += Number(it.quantity);
      prev.gross += Number(it.unit_price) * Number(it.quantity);
      productMap.set(key, prev);
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
    return { gross: round2(gross), net, vat, paymentSplit, products, orderCount: orders.length };
  }, [orders, items]);

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

  const exportCsv = () => {
    const rows: string[][] = [
      ["Datums", "Pasūtījuma Nr.", "Rēķina Nr.", "Klients", "Tips", "Reģ.Nr.", "PVN Nr.", "Maksājums", "Statuss", "Bruto EUR", "Neto EUR", "PVN EUR", "PVN likme %"],
    ];
    for (const o of orders) {
      const gross = Number(o.total);
      const net = round2(gross / (1 + VAT_RATE / 100));
      const vat = round2(gross - net);
      rows.push([
        new Date(o.created_at).toLocaleString("lv-LV"),
        `#${String(o.order_number).padStart(4, "0")}`,
        "", // invoice number — loaded separately if needed
        o.is_business ? (o.company_name ?? "") : (o.shipping_name ?? ""),
        o.is_business ? "B2B" : "B2C",
        o.company_reg_number ?? "",
        o.company_vat_number ?? "",
        o.payment_method ?? o.provider ?? "",
        o.status,
        gross.toFixed(2),
        net.toFixed(2),
        vat.toFixed(2),
        String(VAT_RATE),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `atskaite_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const setPreset = (days: number) => {
    setFrom(todayISO(-days + 1));
    setTo(todayISO(0));
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">No</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] mt-1 justify-start text-left font-normal text-xs", !from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {from ? format(new Date(from), "dd.MM.yyyy") : "Izvēlies"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from ? new Date(from) : undefined} onSelect={(d) => d && setFrom(d.toISOString().slice(0, 10))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Līdz</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] mt-1 justify-start text-left font-normal text-xs", !to && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {to ? format(new Date(to), "dd.MM.yyyy") : "Izvēlies"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to ? new Date(to) : undefined} onSelect={(d) => d && setTo(d.toISOString().slice(0, 10))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setPreset(1); }}>Šodien</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setPreset(7); }}>7 dienas</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setPreset(30); }}>30 dienas</Button>
          </div>
          <Button size="sm" onClick={load} disabled={loading}>{loading ? "Ielādē..." : "Atsvaidzināt"}</Button>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={!orders.length}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Eksportēt grāmatvedībai (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Package className="w-3.5 h-3.5" /> Pasūtījumi</div><p className="text-2xl font-display">{summary.orderCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Euro className="w-3.5 h-3.5" /> Neto</div><p className="text-2xl font-display">{summary.net.toFixed(2)} €</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Receipt className="w-3.5 h-3.5" /> PVN 21%</div><p className="text-2xl font-display">{summary.vat.toFixed(2)} €</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3.5 h-3.5" /> Bruto</div><p className="text-2xl font-display text-primary">{summary.gross.toFixed(2)} €</p></CardContent></Card>
      </div>

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

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> Pasūtījumi ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nav pasūtījumu izvēlētajā periodā</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Laiks</TableHead>
                    <TableHead className="text-xs">Nr.</TableHead>
                    <TableHead className="text-xs">Klients</TableHead>
                    <TableHead className="text-xs">Preces</TableHead>
                    <TableHead className="text-xs text-right">Summa</TableHead>
                    <TableHead className="text-xs">Maksājums</TableHead>
                    <TableHead className="text-xs">Statuss</TableHead>
                    <TableHead className="text-xs text-right">Pavadzīme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const its = itemsByOrder.get(o.id) ?? [];
                    const customer = o.is_business
                      ? (o.company_name ?? o.shipping_name ?? "—")
                      : (o.shipping_name ?? o.guest_email ?? "—");
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("lv-LV", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-xs font-mono">#{String(o.order_number).padStart(4, "0")}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[180px]">{customer}</span>
                            {o.is_business && <Badge variant="outline" className="text-[9px] w-fit mt-0.5">B2B</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-0.5 max-w-[260px]">
                            {its.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              its.slice(0, 3).map((it) => (
                                <span key={it.id} className="truncate">
                                  <span className="text-muted-foreground">×{it.quantity}</span> {it.product_name}
                                </span>
                              ))
                            )}
                            {its.length > 3 && <span className="text-muted-foreground">+{its.length - 3} citas…</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold whitespace-nowrap">{Number(o.total).toFixed(2)} €</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{paymentLabel(o)}</Badge>
                        </TableCell>
                        <TableCell>{statusBadge(o)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => { setInvoiceOrder(o); setInvoiceOpen(true); }}
                            title="Skatīt pavadzīmi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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