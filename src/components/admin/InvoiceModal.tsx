import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Download, FileText, Send, Eye, Pencil } from "lucide-react";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSaved?: () => void;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  version: number;
  is_current: boolean;
  pdf_path: string;
  buyer_snapshot: any;
  items_snapshot: any;
  notes: string | null;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  generated_at: string;
  viewed_at: string | null;
  sent_at: string | null;
}

export const InvoiceModal = ({ open, onOpenChange, order, onSaved }: InvoiceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [current, setCurrent] = useState<InvoiceRow | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", reg_number: "", vat_number: "", email: "", phone: "", notes: "",
  });

  const loadInvoices = async (orderId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices").select("*")
      .eq("order_id", orderId).order("version", { ascending: false });
    const list = (data as any as InvoiceRow[]) ?? [];
    setInvoices(list);
    const cur = list.find((i) => i.is_current) ?? list[0] ?? null;
    setCurrent(cur);
    if (cur) {
      const buyer = cur.buyer_snapshot ?? {};
      setForm({
        name: buyer.name ?? "", address: buyer.address ?? "",
        reg_number: buyer.reg_number ?? "", vat_number: buyer.vat_number ?? "",
        email: buyer.email ?? "", phone: buyer.phone ?? "",
        notes: cur.notes ?? "",
      });
      await loadPdf(cur.id);
    } else {
      setPdfUrl(null);
    }
    setLoading(false);
  };

  const loadPdf = async (invoiceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-pdf?invoice_id=${invoiceId}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      toast.error(`PDF ielādes kļūda: ${e.message}`);
    }
  };

  useEffect(() => {
    if (open && order?.id) loadInvoices(order.id);
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  const regenerate = async (overrides?: boolean) => {
    if (!order?.id) return;
    setGenerating(true);
    try {
      const body: any = { order_id: order.id };
      if (overrides) {
        body.buyer_overrides = {
          name: form.name, address: form.address,
          reg_number: form.reg_number, vat_number: form.vat_number,
          email: form.email, phone: form.phone,
        };
        body.notes = form.notes;
        body.force_new_version = true;
      }
      const { data, error } = await supabase.functions.invoke("generate-invoice", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Rēķins izveidots");
      setEditing(false);
      await loadInvoices(order.id);
      onSaved?.();
    } catch (e: any) {
      toast.error(`Kļūda: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const download = async () => {
    if (!current) return;
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-pdf?invoice_id=${current.id}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
    const blob = await resp.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${current.invoice_number}_v${current.version}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-display text-base sm:text-lg">
            <FileText className="w-5 h-5 shrink-0" />
            <span className="mr-1">Pārvaldīt rēķinu</span>
            {current && (
              <>
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">{current.invoice_number}</Badge>
                <Badge variant="outline" className="text-[10px]">v{current.version}</Badge>
                {current.viewed_at && <Badge variant="outline" className="text-[10px] gap-1"><Eye className="w-3 h-3" /> Skatīts</Badge>}
                {current.sent_at && <Badge variant="outline" className="text-[10px] gap-1"><Send className="w-3 h-3" /> Nosūtīts</Badge>}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_380px] overflow-y-auto md:overflow-hidden">
          {/* PDF preview */}
          <div className="bg-muted/30 md:border-r border-b md:border-b-0 border-border flex items-center justify-center overflow-hidden h-[55vh] md:h-auto">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : !current ? (
              <div className="text-center p-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Šim pasūtījumam vēl nav rēķina.</p>
                <Button onClick={() => regenerate(false)} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Izveidot rēķinu
                </Button>
              </div>
            ) : pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full" title="Invoice PDF" />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Side panel */}
          <div className="overflow-y-auto p-5 space-y-4">
            {current && (
              <>
                <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1 font-body">
                  <div className="flex justify-between"><span className="text-muted-foreground">Neto:</span><span>{Number(current.net_amount).toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">PVN 21%:</span><span>{Number(current.vat_amount).toFixed(2)} €</span></div>
                  <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border"><span>Bruto:</span><span>{Number(current.gross_amount).toFixed(2)} €</span></div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={download}>
                    <Download className="w-3.5 h-3.5" /> Lejupielādēt
                  </Button>
                  <Button size="sm" variant={editing ? "default" : "outline"} className="gap-1.5" onClick={() => setEditing((e) => !e)}>
                    <Pencil className="w-3.5 h-3.5" /> {editing ? "Atcelt" : "Rediģēt"}
                  </Button>
                </div>

                {editing && (
                  <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-semibold">Rediģēt pircēja rekvizītus</p>
                    <div className="space-y-2 text-xs">
                      <div><Label className="text-[11px]">Nosaukums / vārds</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-xs h-8" /></div>
                      <div><Label className="text-[11px]">Adrese</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="text-xs h-8" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[11px]">Reģ. Nr.</Label><Input value={form.reg_number} onChange={(e) => setForm({ ...form, reg_number: e.target.value })} className="text-xs h-8" /></div>
                        <div><Label className="text-[11px]">PVN Nr.</Label><Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} className="text-xs h-8" /></div>
                      </div>
                      <div><Label className="text-[11px]">E-pasts</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="text-xs h-8" /></div>
                      <div><Label className="text-[11px]">Telefons</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-xs h-8" /></div>
                      <div><Label className="text-[11px]">Piezīmes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-xs" rows={3} /></div>
                    </div>
                    <Button size="sm" className="w-full gap-1.5" onClick={() => regenerate(true)} disabled={generating}>
                      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Saglabāt un pārģenerēt (v{(current.version) + 1})
                    </Button>
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};