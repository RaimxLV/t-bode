import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X, Archive, Inbox, TrendingUp, Clock, CheckCircle, ShoppingCart, Euro, ChevronDown, ChevronUp, Search, Trash2, FileText, Building2, Truck, Download, Loader2, Landmark, BadgeCheck, Bell, BellRing, BellOff, FlaskConical, AlertCircle, Info, FileArchive, RefreshCw, Lock, Unlock, Phone, Mail, Undo2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isOfficePickup, stripOfficePrefix } from "@/lib/officePickup";

const InvoiceModal = lazy(() => import("./InvoiceModal").then(m => ({ default: m.InvoiceModal })));
import { ZakekePrintFilesButton } from "./ZakekePrintFilesButton";

const ORDER_STATUSES = [
  { value: "pending", key: "admin.orderStatuses.pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  { value: "confirmed", key: "admin.orderStatuses.confirmed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
  { value: "processing", key: "admin.orderStatuses.processing", color: "bg-purple-100 text-purple-800 border-purple-200", icon: TrendingUp },
  { value: "shipped", key: "admin.orderStatuses.shipped", color: "bg-cyan-100 text-cyan-800 border-cyan-200", icon: ShoppingCart },
  { value: "delivered", key: "admin.orderStatuses.delivered", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  { value: "cancelled", key: "admin.orderStatuses.cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: X },
];

// Only fully completed (delivered & paid) orders go to the archive.
// Cancelled / deleted orders never enter the archive and never affect reports.
const ARCHIVED_STATUSES = ["delivered"];
const HIDDEN_FROM_INBOX_STATUSES = ["cancelled"]; // shown only via explicit "cancelled" filter

// Allowed forward transitions. Status flow is one-way to prevent illogical changes.
// Admins can still override via an unlock toggle (e.g. correcting mistakes).
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const canTransitionTo = (from: string, to: string) => from === to || (STATUS_TRANSITIONS[from] ?? []).includes(to);

const hasReadyPrintFiles = (files: any): boolean => {
  if (!files) return false;
  if (Array.isArray(files)) return files.length > 0;
  return typeof files === "object" && Object.keys(files).length > 0;
};

const isOrderPaid = (order: any): boolean => {
  const montonioStatus = (order?.montonio_payment_status ?? "").toString().toUpperCase();
  return !!order?.manually_paid_at
    || montonioStatus === "PAID"
    || ["confirmed", "processing", "shipped", "delivered"].includes(order?.status ?? "");
};

interface OrdersListProps {
  orders: any[];
  orderItems: Record<string, any[]>;
  loading: boolean;
  onRefresh: () => void;
}

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) => (
  <Card className="border border-border">
    <CardContent className="p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-display leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground font-body">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const formatOrderNumber = (orderNumber: number | null | undefined, orderId: string) => {
  if (orderNumber != null) return `#${String(orderNumber).padStart(4, "0")}`;
  return `#${orderId.slice(0, 8).toUpperCase()}`;
};

export const OrdersList = ({ orders, orderItems, loading, onRefresh }: OrdersListProps) => {
  const { t } = useTranslation();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;
  const [omnivaLoading, setOmnivaLoading] = useState<Record<string, "create" | "label" | null>>({});
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagOrder, setDiagOrder] = useState<any | null>(null);
  const [diagSteps, setDiagSteps] = useState<Array<{ step: string; status: "ok" | "error" | "info"; detail?: string }>>([]);
  const [diagPreview, setDiagPreview] = useState<any | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagFatal, setDiagFatal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  // Per-order override toggle: when true, allow free status changes (admin override)
  const [statusOverride, setStatusOverride] = useState<Set<string>>(new Set());
  const [showCancelled, setShowCancelled] = useState(false);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Map of product_id → blog post that sourced it (Svētku iedvesma).
  // Used to flag the items in admin so workers know which design file to grab.
  const [blogByProduct, setBlogByProduct] = useState<Record<string, { title: string; slug: string }>>({});

  useEffect(() => {
    const productIds = Array.from(
      new Set(
        Object.values(orderItems)
          .flat()
          .map((it: any) => it?.product_id)
          .filter(Boolean)
      )
    ) as string[];
    if (productIds.length === 0) {
      setBlogByProduct({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("blog_post_products")
        .select("product_id, blog_posts!inner(title, slug)")
        .in("product_id", productIds);
      if (cancelled || error) return;
      const map: Record<string, { title: string; slug: string }> = {};
      (data ?? []).forEach((row: any) => {
        const bp = row.blog_posts;
        if (bp && !map[row.product_id]) map[row.product_id] = { title: bp.title, slug: bp.slug };
      });
      setBlogByProduct(map);
    })();
    return () => { cancelled = true; };
  }, [orderItems]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
      toast.success("Saraksts atjaunots");
    } finally {
      // small delay so the spinner is visible even on instant refreshes
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      link.remove();
    }, 1500);
  };

  const toggleOverride = (id: string) => {
    setStatusOverride((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mark order as opened (read) the first time admin expands it.
  const markOrderOpened = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.admin_opened_at) return;
    const { error } = await supabase
      .from("orders")
      .update({ admin_opened_at: new Date().toISOString() })
      .eq("id", orderId);
    if (!error) onRefresh();
  };

  const markOrderUnread = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ admin_opened_at: null })
      .eq("id", orderId);
    if (error) toast.error("Neizdevās atzīmēt kā nelasītu");
    else { toast.success("Atzīmēts kā nelasīts"); onRefresh(); }
  };

  // Visual urgency: green = new/unread, red shades = stale unread, grey = handled.
  const getOrderUrgency = (order: any): { card: string; tone: "new" | "stale1" | "stale2" | "handled" | "archived" } => {
    if (ARCHIVED_STATUSES.includes(order.status) || order.status === "cancelled") {
      return { card: "border-border bg-muted/30 opacity-80", tone: "archived" };
    }
    if (order.admin_opened_at) {
      return { card: "border-border bg-card", tone: "handled" };
    }
    const ageMs = Date.now() - new Date(order.created_at).getTime();
    const days = ageMs / (1000 * 60 * 60 * 24);
    if (days >= 2) return { card: "border-red-400 bg-red-100/70 dark:bg-red-950/40", tone: "stale2" };
    if (days >= 1) return { card: "border-red-300 bg-red-50/60 dark:bg-red-950/20", tone: "stale1" };
    return { card: "border-green-400 bg-green-50/60 dark:bg-green-950/20", tone: "new" };
  };

  const downloadSelectedLabels = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omniva-bulk-labels`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ order_ids: ids }),
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); if (j?.error) detail = j.error; } catch {}
        throw new Error(detail);
      }
      const included = resp.headers.get("X-Labels-Included") ?? "?";
      const failed = resp.headers.get("X-Labels-Failed") ?? "0";
      const blob = await resp.blob();
      triggerBlobDownload(blob, `omniva-labels-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`Lejupielādētas ${included} pavadzīmes${Number(failed) > 0 ? ` (${failed} neizdevās)` : ""}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(`Bulk lejupielāde neizdevās: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadSelectedInvoices = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoices-bulk-download`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ order_ids: ids }),
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); if (j?.error) detail = j.error; } catch {}
        throw new Error(detail);
      }
      const included = resp.headers.get("X-Invoices-Included") ?? "?";
      const failed = resp.headers.get("X-Invoices-Failed") ?? "0";
      const blob = await resp.blob();
      triggerBlobDownload(blob, `invoices-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`Lejupielādēti ${included} rēķini${Number(failed) > 0 ? ` (${failed} neizdevās)` : ""}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(`Rēķinu lejupielāde neizdevās: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const runOmnivaTest = async (order: any) => {
    setDiagOrder(order);
    setDiagOpen(true);
    setDiagRunning(true);
    setDiagSteps([]);
    setDiagPreview(null);
    setDiagFatal(null);
    try {
      // Use raw fetch so we can read the JSON body even on non-2xx responses
      // (supabase.functions.invoke discards the body on errors).
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omniva-create-shipment`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({ order_id: order.id, debug: true }),
      });
      let payload: any = {};
      try {
        payload = await resp.json();
      } catch {
        setDiagFatal(`HTTP ${resp.status} — atbilde nav JSON formātā`);
      }
      if (Array.isArray(payload.steps)) setDiagSteps(payload.steps);
      if (payload.preview) setDiagPreview(payload.preview);
      if (payload.error) setDiagFatal(payload.error);
      if (!resp.ok && !payload.error) {
        setDiagFatal(`HTTP ${resp.status}`);
      }
    } catch (e: any) {
      setDiagFatal(e?.message ?? String(e));
    } finally {
      setDiagRunning(false);
    }
  };

  const getStatusInfo = (status: string) => ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];

  const createOmnivaShipment = async (orderId: string) => {
    setOmnivaLoading((p) => ({ ...p, [orderId]: "create" }));
    try {
      const { data, error } = await supabase.functions.invoke("omniva-create-shipment", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${t("admin.omnivaShipmentCreated")}: ${data.barcode}`);
      onRefresh();
    } catch (err: any) {
      toast.error(`${t("admin.omnivaShipmentError")}: ${err.message || err}`);
    } finally {
      setOmnivaLoading((p) => ({ ...p, [orderId]: null }));
    }
  };

  const downloadOmnivaLabel = async (orderId: string, barcode: string) => {
    setOmnivaLoading((p) => ({ ...p, [orderId]: "label" }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omniva-label-pdf?order_id=${orderId}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const j = await resp.json();
          if (j?.error) detail = `${detail}: ${j.error}`;
        } catch {}
        throw new Error(detail);
      }
      const blob = await resp.blob();
      triggerBlobDownload(blob, `omniva-${barcode}.pdf`);
    } catch (err: any) {
      toast.error(`${t("admin.omnivaLabelError")}: ${err.message || err}`);
    } finally {
      setOmnivaLoading((p) => ({ ...p, [orderId]: null }));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const order = orders.find((o) => o.id === orderId);
    const currentStatus = order?.status;
    const isOverride = statusOverride.has(orderId);
    if (currentStatus && !isOverride && !canTransitionTo(currentStatus, status)) {
      toast.error("Šī statusa maiņa nav atļauta. Ieslēdz “Manual override”, lai labotu.");
      return;
    }
    // Block "production-ready" transitions until all Zakeke print files have
    // actually been downloaded by an admin. Override bypasses the check.
    if (!isOverride && (status === "shipped" || status === "delivered")) {
      const items = orderItems[orderId] ?? [];
      const missing = items.filter(
        (it: any) => it.zakeke_design_id && !it.zakeke_files_downloaded_at,
      );
      if (missing.length > 0) {
        const names = missing.map((it: any) => `• ${it.product_name}`).join("\n");
        toast.error(
          `Vispirms lejupielādē drukas failus (${missing.length} prece${
            missing.length === 1 ? "i" : "s"
          }):\n${names}`,
          { duration: 6000 },
        );
        return;
      }
    }
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else {
      toast.success(t("admin.statusUpdated"));
      // Auto-send tracking email when order is marked as shipped
      if (status === "shipped") {
        if (order?.omniva_barcode) {
          try {
            // Reset sent flag so admin re-triggering "shipped" resends the email
            await supabase.from("orders").update({ tracking_email_sent_at: null }).eq("id", orderId);
            const { error: invokeErr } = await supabase.functions.invoke("send-tracking-email", {
              body: { order_id: orderId },
            });
            if (invokeErr) toast.error(`Tracking e-pasts: ${invokeErr.message}`);
            else toast.success("Izsekošanas e-pasts nosūtīts klientam");
          } catch (e: any) {
            toast.error(`Tracking e-pasts: ${e.message}`);
          }
        } else {
          toast.warning("Pasūtījumam nav Omniva barcode — e-pasts nav nosūtīts");
        }
      }
      // Auto-send cancellation email when order is cancelled
      if (status === "cancelled") {
        try {
          const { error: invokeErr } = await supabase.functions.invoke("send-order-cancelled", {
            body: { order_id: orderId, lang: "lv" },
          });
          if (invokeErr) toast.error(`Atcelšanas e-pasts: ${invokeErr.message}`);
          else toast.success("Atcelšanas e-pasts nosūtīts klientam");
        } catch (e: any) {
          toast.error(`Atcelšanas e-pasts: ${e.message}`);
        }
      }
      onRefresh();
    }
  };

  const sendPaymentReminder = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-payment-reminder", {
        body: { order_id: orderId, lang: "lv" },
      });
      if (error) throw error;
      if ((data as any)?.sent) toast.success("Atgādinājums nosūtīts");
      else toast.warning(`Izlaists: ${(data as any)?.reason ?? "nezināms iemesls"}`);
      onRefresh();
    } catch (e: any) {
      toast.error(`Atgādinājums neizdevās: ${e.message}`);
    }
  };

  const markAsPaid = async (orderId: string) => {
    if (!confirm(t("admin.markPaidConfirm", "Apstiprināt, ka maksājums ir saņemts bankā?"))) return;
    const { error } = await supabase
      .from("orders")
      .update({
        status: "processing" as any,
        manually_paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else { toast.success(t("admin.markedAsPaid", "Pasūtījums atzīmēts kā apmaksāts")); onRefresh(); }
  };

  const refundOrder = async (orderId: string) => {
    if (!confirm("Veikt PILNU atmaksu klientam? Pasūtījums tiks atcelts un tiks ģenerēts kredītrēķins.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("refund-order", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast.success("Atmaksa veikta. Kredītrēķins ģenerēts.");
        onRefresh();
      } else {
        toast.error(`Atmaksa neizdevās: ${(data as any)?.error ?? "nezināma kļūda"}`);
      }
    } catch (e: any) {
      toast.error(`Atmaksa neizdevās: ${e.message}`);
    }
  };

  const markOfficePickupReady = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    // Block until all Zakeke print files have been downloaded.
    const items = orderItems[orderId] ?? [];
    const missing = items.filter(
      (it: any) => it.zakeke_design_id && !it.zakeke_files_downloaded_at,
    );
    if (missing.length > 0) {
      const names = missing.map((it: any) => `• ${it.product_name}`).join("\n");
      toast.error(
        `Vispirms lejupielādē drukas failus (${missing.length} prece${
          missing.length === 1 ? "i" : "s"
        }):\n${names}`,
        { duration: 6000 },
      );
      return;
    }
    // Warn admin if marking ready while payment is still outstanding.
    const isPaid = !!order?.manually_paid_at
      || ["confirmed", "processing", "shipped", "delivered"].includes(order?.status ?? "");
    if (!isPaid) {
      const ok = confirm(
        "BRĪDINĀJUMS: Šis pasūtījums vēl nav apmaksāts.\n\nVai tiešām atzīmēt kā gatavu un izsniegt klientam bez maksas?"
      );
      if (!ok) return;
    }
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" as any })
      .eq("id", orderId);
    if (error) { toast.error("Kļūda: " + error.message); return; }
    try {
      const { error: emailErr } = await supabase.functions.invoke("send-pickup-ready-email", {
        body: { order_id: orderId },
      });
      if (emailErr) toast.warning("Atzīmēts kā gatavs, bet e-pasts netika nosūtīts: " + emailErr.message);
      else toast.success("Pasūtījums atzīmēts kā gatavs un klientam nosūtīts e-pasts");
    } catch (e: any) {
      toast.warning("Atzīmēts kā gatavs, bet e-pasts netika nosūtīts: " + e.message);
    }
    onRefresh();
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Vai tiešām vēlaties dzēst šo pasūtījumu? Šī darbība ir neatgriezeniska.")) return;
    // Delete order items first, then the order
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) toast.error("Kļūda dzēšot pasūtījumu: " + error.message);
    else { toast.success("Pasūtījums dzēsts"); setExpandedOrder(null); onRefresh(); }
  };

  // Permanently delete every archived order (cancelled/delivered).
  // Cascading FKs remove order_items, invoices, and promo_code_redemptions.
  const clearArchive = async () => {
    const ids = orders
      .filter((o) => ARCHIVED_STATUSES.includes(o.status))
      .map((o) => o.id);
    if (ids.length === 0) {
      toast.info("Arhīvs jau ir tukšs");
      return;
    }
    if (!confirm(`Vai tiešām dzēst VISUS ${ids.length} arhivētos pasūtījumus? Šī darbība ir neatgriezeniska un izdzēs arī ar tiem saistītos rēķinus un preces.`)) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Izdzēsti ${ids.length} arhivētie pasūtījumi`);
      setExpandedOrder(null);
      setSelectedIds(new Set());
      onRefresh();
    } catch (e: any) {
      toast.error("Kļūda tīrot arhīvu: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete all unpaid pending orders (abandoned carts / spam).
  const clearUnpaid = async () => {
    const ids = orders
      .filter((o) => o.status === "pending" && !isOrderPaid(o))
      .map((o) => o.id);
    if (ids.length === 0) { toast.info("Nav nesamaksātu pasūtījumu"); return; }
    if (!confirm(`Dzēst VISUS ${ids.length} nesamaksātos pasūtījumus? Šī darbība ir neatgriezeniska.`)) return;
    setBulkLoading(true);
    try {
      await supabase.from("order_items").delete().in("order_id", ids);
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Izdzēsti ${ids.length} nesamaksātie pasūtījumi`);
      setExpandedOrder(null);
      setSelectedIds(new Set());
      onRefresh();
    } catch (e: any) {
      toast.error("Kļūda dzēšot: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Re-render every existing invoice with the latest PDF template so old
  // documents look identical to newly issued ones.
  const regenerateAllInvoices = async () => {
    const { data: invoiceRows, error: listErr } = await supabase
      .from("invoices")
      .select("order_id")
      .eq("is_current", true);
    if (listErr) {
      toast.error("Neizdevās ielādēt rēķinu sarakstu: " + listErr.message);
      return;
    }
    const orderIds = Array.from(new Set((invoiceRows ?? []).map((r: any) => r.order_id)));
    if (orderIds.length === 0) {
      toast.info("Nav rēķinu, ko pārģenerēt");
      return;
    }
    if (!confirm(`Pārģenerēt ${orderIds.length} rēķinus ar jaunāko veidni? Vecās versijas tiks saglabātas vēsturē.`)) return;
    setBulkLoading(true);
    let ok = 0;
    let fail = 0;
    for (const oid of orderIds) {
      try {
        const { error } = await supabase.functions.invoke("generate-invoice", {
          body: { order_id: oid, force_new_version: true },
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkLoading(false);
    if (fail === 0) toast.success(`Pārģenerēti ${ok} rēķini`);
    else toast.warning(`Pārģenerēti ${ok}, neizdevās ${fail}`);
    onRefresh();
  };

  const activeOrders = useMemo(
    () => orders.filter((o) => {
      if (ARCHIVED_STATUSES.includes(o.status) || HIDDEN_FROM_INBOX_STATUSES.includes(o.status)) return false;
      // Hide unpaid "pending" orders from the active inbox. These are usually:
      //   - abandoned carts (user started checkout but never paid)
      //   - spam / bot submissions
      // They must NOT appear as work-to-do or inflate stats. They can still be
      // reviewed in the dedicated "Nesamaksātie" tab below.
      if (o.status === "pending" && !isOrderPaid(o)) return false;
      const items = orderItems[o.id] || [];
      const hasPendingZakekeItem = items.some((item: any) => item.zakeke_design_id && !hasReadyPrintFiles(item.zakeke_print_files));
      return !hasPendingZakekeItem;
    }),
    [orders, orderItems]
  );
  const archivedOrders = useMemo(() => orders.filter(o => ARCHIVED_STATUSES.includes(o.status) && isOrderPaid(o)), [orders]);
  const cancelledOrders = useMemo(() => orders.filter(o => o.status === "cancelled"), [orders]);
  const unpaidOrders = useMemo(
    () => orders.filter(o => o.status === "pending" && !isOrderPaid(o)),
    [orders]
  );
  const unreadCount = useMemo(
    () => activeOrders.filter(o => !o.admin_opened_at).length,
    [activeOrders]
  );
  const currentOrders = showUnpaid
    ? unpaidOrders
    : showCancelled
      ? cancelledOrders
      : showArchive
        ? archivedOrders
        : activeOrders;

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status !== "cancelled" && isOrderPaid(o));
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const pendingCount = activeOrders.filter(o => o.status === "pending").length;
    const activeCount = activeOrders.filter(o => ["confirmed", "processing", "shipped"].includes(o.status)).length;
    const processingCount = orders.filter(o => o.status === "processing").length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = paidOrders.filter(o => new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + Number(o.total), 0);
    return { totalRevenue, pendingCount, activeCount, processingCount, monthRevenue };
  }, [orders, activeOrders]);

  const filteredOrders = currentOrders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (filterDateFrom && new Date(order.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo) { const to = new Date(filterDateTo); to.setHours(23, 59, 59, 999); if (new Date(order.created_at) > to) return false; }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const orderNum = formatOrderNumber(order.order_number, order.id).toLowerCase();
      const matchNum = orderNum.includes(q) || String(order.order_number).includes(q);
      const matchName = order.shipping_name?.toLowerCase().includes(q);
      const matchPhone = order.shipping_phone?.toLowerCase().includes(q);
      const matchEmail = order.guest_email?.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  const availableStatuses = showArchive
    ? ORDER_STATUSES.filter(s => ARCHIVED_STATUSES.includes(s.value))
    : ORDER_STATUSES.filter(s => !ARCHIVED_STATUSES.includes(s.value));

  // Reset to page 1 whenever filters / tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDateFrom, filterDateTo, searchQuery, showArchive, showCancelled, showUnpaid]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Euro} label="Kopējie ieņēmumi" value={`${stats.totalRevenue.toFixed(2)} €`} accent="bg-green-50 text-green-600" />
        <StatCard icon={TrendingUp} label="Šī mēneša ieņēmumi" value={`${stats.monthRevenue.toFixed(2)} €`} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={Clock} label="Gaida apstiprinājumu" value={stats.pendingCount} accent="bg-yellow-50 text-yellow-600" />
        <StatCard icon={ShoppingCart} label="Aktīvie pasūtījumi" value={stats.activeCount} accent="bg-purple-50 text-purple-600" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg ${unreadCount > 0 ? "bg-green-100 text-green-700 animate-pulse" : "bg-muted text-muted-foreground"}`}>
            {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-body text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} jauni pasūtījumi gaida` : "Visi pasūtījumi apskatīti"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="ml-auto gap-1.5 text-[11px] sm:text-xs px-2.5"
            title="Atjaunot pasūtījumu sarakstu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atjaunot</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:gap-2 gap-1.5">
          <Button variant={!showArchive && !showCancelled && !showUnpaid && filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => { setShowArchive(false); setShowCancelled(false); setShowUnpaid(false); setFilterStatus("all"); }} className="gap-1 text-[11px] sm:text-xs px-2 min-w-0 justify-center">
            <Inbox className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Ienākošie</span>
              <span className="hidden sm:inline">Ienākošie pasūtījumi</span>
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{activeOrders.length}</Badge>
          </Button>
          <Button variant={showArchive ? "default" : "outline"} size="sm" onClick={() => { setShowArchive(true); setShowCancelled(false); setShowUnpaid(false); setFilterStatus("all"); }} className="gap-1 text-[11px] sm:text-xs px-2 min-w-0 justify-center">
            <Archive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Arhīvs</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{archivedOrders.length}</Badge>
          </Button>
          <Button variant={showUnpaid ? "default" : "outline"} size="sm" onClick={() => { setShowUnpaid(true); setShowArchive(false); setShowCancelled(false); setFilterStatus("all"); }} className="gap-1 text-[11px] sm:text-xs px-2 min-w-0 justify-center">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Nesamaksātie</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{unpaidOrders.length}</Badge>
          </Button>
          <Button variant={showCancelled ? "default" : "outline"} size="sm" onClick={() => { setShowCancelled(true); setShowArchive(false); setShowUnpaid(false); setFilterStatus("all"); }} className="gap-1 text-[11px] sm:text-xs px-2 min-w-0 justify-center">
            <X className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Atceltie</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{cancelledOrders.length}</Badge>
          </Button>
          {showArchive && archivedOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearArchive}
              disabled={bulkLoading}
              className="col-span-3 sm:col-span-1 gap-1.5 text-[11px] sm:text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 justify-center"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Iztīrīt arhīvu
            </Button>
          )}
          {showUnpaid && unpaidOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearUnpaid}
              disabled={bulkLoading}
              className="col-span-2 sm:col-span-1 gap-1.5 text-[11px] sm:text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 justify-center"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Iztīrīt nesamaksātos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateAllInvoices}
            disabled={bulkLoading}
            className="col-span-3 sm:col-span-1 gap-1.5 text-[11px] sm:text-xs px-2 justify-center"
            title="Pārģenerēt visus rēķinus ar jaunāko veidni"
          >
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atjaunot rēķinus
          </Button>
        </div>
        <span className="block text-xs text-muted-foreground font-body">Kopā: {currentOrders.length} pasūtījumi</span>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Meklēt pēc Nr., vārda, e-pasta, telefona..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-xs font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="min-w-0 col-span-2 sm:col-span-1">
            <Label className="font-body text-[11px] text-muted-foreground">Statuss</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{t("admin.filterAll")}</SelectItem>
                {availableStatuses.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label className="font-body text-[11px] text-muted-foreground">{t("admin.filterDateFrom")}</Label>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full text-xs mt-1 px-2" />
          </div>
          <div className="min-w-0">
            <Label className="font-body text-[11px] text-muted-foreground">{t("admin.filterDateTo")}</Label>
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full text-xs mt-1 px-2" />
          </div>
        </div>
        {(filterStatus !== "all" || filterDateFrom || filterDateTo || searchQuery) && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); }}>
            <X className="w-3 h-3 mr-1" /> Notīrīt filtrus
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-body">
              Atlasīti <strong>{selectedIds.size}</strong>
            </span>
            <Button variant="ghost" size="sm" className="text-xs h-7 sm:hidden" onClick={() => setSelectedIds(new Set())}>
              Notīrīt
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button size="sm" className="text-xs gap-1.5 w-full sm:w-auto" onClick={downloadSelectedLabels} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
              Pavadzīmes (ZIP)
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 w-full sm:w-auto" onClick={downloadSelectedInvoices} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Rēķini (ZIP)
            </Button>
            <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex" onClick={() => setSelectedIds(new Set())}>
              Notīrīt atlasi
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingOrders")}</p>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            {showArchive ? <Archive className="w-5 h-5 text-muted-foreground" /> : <Inbox className="w-5 h-5 text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground font-body text-sm">{showArchive ? "Arhīvā nav pasūtījumu" : t("admin.noOrders")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const items = orderItems[order.id] || [];
            const isExpanded = expandedOrder === order.id;
            const StatusIcon = statusInfo.icon;
            const urgency = getOrderUrgency(order);
            const isUnread = !order.admin_opened_at && !ARCHIVED_STATUSES.includes(order.status) && order.status !== "cancelled";
            // Build small thumbnails preview from order items (first product image of each item).
            // On mobile we only have ~384px wide cards so showing 3 thumbnails crushes the
            // order number / total row. Limit to 2 thumbs on small screens via CSS below.
            const previewThumbs = items.slice(0, 3).map((it: any) => {
              const product = it.products;
              const colorVariants = product?.color_variants as any[] | undefined;
              const matchedVariant = it.color && colorVariants?.find((v: any) => v.name === it.color);
              return it.zakeke_thumbnail_url || matchedVariant?.images?.[0] || product?.image_url || null;
            }).filter(Boolean) as string[];
            const extraCount = Math.max(0, items.length - previewThumbs.length);
            const extraCountMobile = Math.max(0, items.length - Math.min(2, previewThumbs.length));
            const hasBlogItem = items.some((it: any) => blogByProduct[it.product_id]);

            return (
              <Card key={order.id} className={`border transition-all ${isExpanded ? "border-primary/40 shadow-md" : urgency.card + " hover:shadow-sm"}`}>
                <CardContent className="p-0">
                  <div className="w-full p-3 sm:p-4 flex items-start gap-2 sm:gap-3 text-left">
                    <div
                      className="shrink-0 flex items-center pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                        aria-label="Atlasīt pasūtījumu"
                      />
                    </div>
                    {previewThumbs.length > 0 && (
                      <div className="relative flex items-center -space-x-1.5 sm:-space-x-2 shrink-0">
                        {previewThumbs.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt=""
                            loading="lazy"
                            className={`w-11 h-11 sm:w-14 sm:h-14 object-cover rounded-md border-2 border-background bg-muted shadow-sm ${idx >= 2 ? "hidden sm:block" : ""}`}
                          />
                        ))}
                        {extraCount > 0 && (
                          <div className="hidden sm:flex w-14 h-14 rounded-md border-2 border-background bg-muted items-center justify-center text-xs font-semibold text-muted-foreground">
                            +{extraCount}
                          </div>
                        )}
                        {extraCountMobile > 0 && (
                          <div className="sm:hidden w-11 h-11 rounded-md border-2 border-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                            +{extraCountMobile}
                          </div>
                        )}
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 ring-2 ring-background z-10" />
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const next = isExpanded ? null : order.id;
                        setExpandedOrder(next);
                        if (next) markOrderOpened(order.id);
                      }}
                      className="flex-1 min-w-0 text-left space-y-1"
                    >
                      {/* Row 1: order #, total, chevron */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body font-semibold text-sm shrink-0">{formatOrderNumber(order.order_number, order.id)}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-body font-bold text-sm sm:text-base">{Number(order.total).toFixed(2)} €</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Row 2: status + badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border ${statusInfo.color}`}>
                          {t(statusInfo.key)}
                        </span>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-bold border bg-green-600 text-white border-green-700">
                            JAUNS
                          </span>
                        )}
                        {order.is_business && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                            B2B
                          </span>
                        )}
                        {order.payment_method === "bank_transfer" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-1">
                            <Landmark className="w-3 h-3" />
                            {t("admin.paymentBank", "Bankas pārsk.")}
                          </span>
                        )}
                        {order.manually_paid_at && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border bg-green-100 text-green-800 border-green-200 inline-flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            {t("admin.paidBadge", "Apmaksāts")}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px]">{items.length} preces</Badge>
                        {hasBlogItem && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border bg-primary/15 text-primary border-primary/40 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Svētku iedvesma
                          </span>
                        )}
                      </div>

                      {/* Row 3: customer + date */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(order.is_business ? order.company_name : order.shipping_name) && (
                          <span className="text-xs text-muted-foreground font-body truncate max-w-full">
                            {order.is_business ? order.company_name : order.shipping_name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-body">
                          {new Date(order.created_at).toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-3 sm:px-4 pb-4 pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {order.is_business && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-1">
                          <p className="text-xs font-semibold font-body text-blue-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> Juridiskās personas dati
                          </p>
                          {order.company_name && <p className="text-xs text-blue-900 font-body">🏢 {order.company_name}</p>}
                          {order.company_reg_number && <p className="text-xs text-blue-900 font-body">📄 Reģ. Nr.: {order.company_reg_number}</p>}
                          {order.company_vat_number && <p className="text-xs text-blue-900 font-body">💼 PVN Nr.: {order.company_vat_number}</p>}
                          {order.company_address && <p className="text-xs text-blue-900 font-body">📍 {order.company_address}</p>}
                          {order.stripe_invoice_pdf && (
                            <a
                              href={order.stripe_invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-blue-700 underline font-body mt-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Lejupielādēt rēķinu (PDF)
                            </a>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold font-body text-foreground">Piegādes informācija</p>
                          {order.shipping_name && <p className="text-xs text-muted-foreground font-body">👤 {order.shipping_name} · {order.shipping_phone}</p>}
                          {order.shipping_address && <p className="text-xs text-muted-foreground font-body">📍 {order.shipping_address}, {order.shipping_city} {order.shipping_zip}</p>}
                          {order.omniva_pickup_point && (
                            isOfficePickup(order.omniva_pickup_point)
                              ? <p className="text-xs text-muted-foreground font-body">🏢 Birojs: {stripOfficePrefix(order.omniva_pickup_point)}</p>
                              : <p className="text-xs text-muted-foreground font-body">📦 Omniva: {order.omniva_pickup_point}</p>
                          )}
                          {order.guest_email && <p className="text-xs text-muted-foreground font-body">✉️ {order.guest_email}</p>}
                          {order.notes && <p className="text-xs text-muted-foreground font-body">📝 {order.notes}</p>}
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {order.shipping_phone && (
                              <a href={`tel:${order.shipping_phone}`} className="inline-flex items-center gap-1 text-[11px] font-body px-2 py-1 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
                                <Phone className="w-3 h-3" /> Zvanīt
                              </a>
                            )}
                            {order.guest_email && (
                              <a href={`mailto:${order.guest_email}?subject=${encodeURIComponent(`T-Bode pasūtījums ${formatOrderNumber(order.order_number, order.id)}`)}`} className="inline-flex items-center gap-1 text-[11px] font-body px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors">
                                <Mail className="w-3 h-3" /> Rakstīt
                              </a>
                            )}
                            {(order.manually_paid_at || ["confirmed","processing","shipped","delivered"].includes(order.status)) && (
                              <button
                                type="button"
                                onClick={() => refundOrder(order.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-body px-2 py-1 rounded border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-colors"
                                title="Veikt pilnu atmaksu klientam un atcelt pasūtījumu"
                              >
                                <Undo2 className="w-3 h-3" /> Atmaksāt
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <div className="flex items-center justify-between w-full sm:w-[200px] gap-2">
                            <p className="text-xs font-semibold font-body text-foreground">Mainīt statusu</p>
                            <button
                              type="button"
                              onClick={() => toggleOverride(order.id)}
                              className={`inline-flex items-center gap-1 text-[10px] font-body px-1.5 py-0.5 rounded border transition-colors ${
                                statusOverride.has(order.id)
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
                              }`}
                              title={statusOverride.has(order.id) ? "Override aktīvs — iespējamas visas pārejas" : "Atbloķēt brīvu statusa maiņu (override)"}
                            >
                              {statusOverride.has(order.id) ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {statusOverride.has(order.id) ? "Override" : "Bloķēts"}
                            </button>
                          </div>
                          {(() => {
                            const allowed = statusOverride.has(order.id)
                              ? ORDER_STATUSES
                              : ORDER_STATUSES.filter((s) => canTransitionTo(order.status, s.value));
                            const isLocked = !statusOverride.has(order.id) && allowed.length <= 1;
                            return (
                              <>
                                <Select
                                  value={order.status}
                                  onValueChange={(v) => updateOrderStatus(order.id, v)}
                                  disabled={isLocked}
                                >
                                  <SelectTrigger className="w-full sm:w-[200px] text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {allowed.map((s) => (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isLocked && (
                                  <p className="text-[10px] text-muted-foreground font-body sm:text-right">
                                    {order.status === "delivered"
                                      ? "Statuss tiek atjaunināts automātiski no Omniva izsekošanas."
                                      : "Termināls statuss — bez pāreju."}
                                  </p>
                                )}
                                {!isLocked && !statusOverride.has(order.id) && order.omniva_barcode && (
                                  <p className="text-[10px] text-muted-foreground font-body sm:text-right">
                                    Tiklīdz klients izņems paku, statuss mainīsies automātiski.
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto justify-center text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 mt-1"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Dzēst pasūtījumu
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto justify-center text-xs gap-1.5 mt-1"
                            onClick={() => setInvoiceOrder(order)}
                          >
                            <FileText className="w-3.5 h-3.5" /> Pārvaldīt dokumentu
                          </Button>
                          {order.admin_opened_at && order.status !== "delivered" && order.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto justify-center text-xs gap-1.5 mt-1 border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => markOrderUnread(order.id)}
                              title="Atzīmēt kā nelasītu — kartīte atkal kļūs zaļa"
                            >
                              <BellOff className="w-3.5 h-3.5" /> Atzīmēt kā nelasītu
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Bank transfer block */}
                      {order.payment_method === "bank_transfer" && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                          <p className="text-xs font-semibold font-body text-amber-900 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5" /> {t("admin.bankTransferPayment", "Bankas pārskaitījums")}
                          </p>
                          {order.manually_paid_at ? (
                            <p className="text-xs text-green-800 font-body inline-flex items-center gap-1.5">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              {t("admin.markedPaidOn", "Atzīmēts kā apmaksāts")}: {new Date(order.manually_paid_at).toLocaleString("lv-LV")}
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] text-amber-900 font-body">
                                {t("admin.awaitingBankPayment", "Gaida apmaksu bankas kontā. Atzīmējiet pasūtījumu kā apmaksātu, kad nauda ir saņemta.")}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-xs gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => markAsPaid(order.id)}
                                >
                                  <BadgeCheck className="w-3.5 h-3.5" />
                                  {t("admin.markAsPaid", "Atzīmēt kā apmaksātu")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1.5 h-8 border-amber-300 text-amber-900 hover:bg-amber-100"
                                  onClick={() => sendPaymentReminder(order.id)}
                                  title={order.last_payment_reminder_at ? `Pēdējais: ${new Date(order.last_payment_reminder_at).toLocaleString("lv-LV")}` : "Sūtīt atgādinājumu klientam"}
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                  {order.last_payment_reminder_at ? "Atgādināt vēlreiz" : "Atgādināt par apmaksu"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1.5 h-8 border-amber-400 text-amber-900 hover:bg-amber-100"
                                  onClick={() => setInvoiceOrder(order)}
                                  title="Atver rēķina logu — tur var izveidot/lejupielādēt PDF un nosūtīt klientam manuāli"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Sagatavot rēķinu (PDF)
                                </Button>
                              </div>
                            </>
                          )}
                          {order.stripe_invoice_pdf && (
                            <a
                              href={order.stripe_invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-amber-900 underline font-body"
                            >
                              <FileText className="w-3.5 h-3.5" /> {t("admin.downloadInvoice", "Lejupielādēt rēķinu")}
                            </a>
                          )}
                        </div>
                      )}

                      {isOfficePickup(order.omniva_pickup_point) ? (
                        order.status === "delivered" ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 w-fit">
                            <CheckCircle className="w-3 h-3 mr-1" /> Pasūtījums izsniegts
                          </Badge>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-fit justify-center"
                            onClick={() => markOfficePickupReady(order.id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Pasūtījums ir gatavs
                          </Button>
                        )
                      ) : (order.omniva_pickup_point || order.shipping_address) ? (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <p className="text-xs font-semibold font-body text-foreground flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> {order.omniva_pickup_point ? t("admin.omnivaShipment") : "Omniva kurjers"}
                        </p>
                        {order.omniva_barcode ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-muted-foreground font-body">{t("admin.omnivaBarcode")}:</span>
                              <code className="text-xs bg-background px-2 py-0.5 rounded border border-border font-mono">{order.omniva_barcode}</code>
                              {order.omniva_tracking_status && (
                                <Badge variant="outline" className="text-[10px]">{order.omniva_tracking_status}</Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5 h-8"
                              onClick={() => downloadOmnivaLabel(order.id, order.omniva_barcode)}
                              disabled={omnivaLoading[order.id] === "label"}
                            >
                              {omnivaLoading[order.id] === "label" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              {t("admin.omnivaDownloadLabel")}
                            </Button>
                            {order.status !== "delivered" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={async () => {
                                  if (!confirm("Atzīmēt sūtījumu kā piegādātu un pārvietot uz arhīvu?")) return;
                                  const { error } = await supabase
                                    .from("orders")
                                    .update({
                                      status: "delivered" as any,
                                      omniva_tracking_status: "delivered",
                                    })
                                    .eq("id", order.id);
                                  if (error) toast.error("Kļūda: " + error.message);
                                  else { toast.success("Pasūtījums atzīmēts kā gatavs un pārvietots uz arhīvu"); onRefresh(); }
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Pasūtījums gatavs (arhivēt)
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs gap-1.5 h-8"
                              onClick={() => createOmnivaShipment(order.id)}
                              disabled={omnivaLoading[order.id] === "create"}
                            >
                              {omnivaLoading[order.id] === "create" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                              {t("admin.omnivaCreateShipment")}
                            </Button>
                          </div>
                        )}
                        </div>
                      ) : null}

                      {items.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          {/* Mobile: stacked cards */}
                          <div className="sm:hidden divide-y divide-border">
                            {items.map((item: any) => {
                              const product = item.products;
                              const colorVariants = product?.color_variants as any[] | undefined;
                              const matchedVariant = item.color && colorVariants?.find((v: any) => v.name === item.color);
                              const thumbUrl = item.zakeke_thumbnail_url || matchedVariant?.images?.[0] || product?.image_url || null;
                              const blog = blogByProduct[item.product_id];
                              const designUrl = product?.image_url || null;
                              return (
                                <div key={item.id} className="p-2.5 space-y-2 bg-card">
                                  <div className="flex gap-2.5">
                                    {thumbUrl ? (
                                      <img src={thumbUrl} alt={item.product_name} className="w-14 h-14 object-cover rounded border border-border shrink-0" />
                                    ) : (
                                      <div className="w-14 h-14 bg-muted rounded border border-border shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <p className="text-xs font-body font-semibold leading-tight break-words">{item.product_name}</p>
                                      {blog && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] py-0 gap-1">
                                            <Sparkles className="w-3 h-3" /> Svētku iedvesma
                                          </Badge>
                                          <span className="text-[10px] text-muted-foreground break-words">{blog.title}</span>
                                          {designUrl && (
                                            <a
                                              href={designUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                            >
                                              <Download className="w-3 h-3" /> Dizains
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {item.zakeke_design_id && (
                                        item.is_bulk ? (
                                          <Badge className="bg-orange-100 text-orange-900 border-orange-300 text-[10px] py-0">
                                            BULK: UNIFIED PRINT SIZE
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] py-0">
                                            INDIVIDUAL: SCALED PER SIZE
                                          </Badge>
                                        )
                                      )}
                                      <div className="flex flex-wrap gap-1">
                                        {item.is_bulk && item.selected_sizes ? (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-900 font-medium">
                                            Kopā: {item.quantity} gab · {Object.entries(item.selected_sizes as Record<string, number>).map(([s, n]) => `${n}×${s}`).join(", ")}
                                          </span>
                                        ) : (
                                          item.size && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Izmērs: {item.size}</span>
                                        )}
                                        {item.color && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Krāsa: {item.color}</span>}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">×{item.quantity}</span>
                                      </div>
                                      <p className="text-xs font-semibold">{item.unit_price.toFixed(2)} €</p>
                                    </div>
                                  </div>
                                  <ZakekePrintFilesButton
                                    item={item}
                                    variant="block"
                                    orderNumber={order.order_number}
                                    clientName={order.is_business ? (order.company_name ?? order.shipping_name) : (order.shipping_name ?? order.guest_email)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          {/* Desktop: table */}
                          <Table className="hidden sm:table">
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-[11px]">{t("admin.orderProduct")}</TableHead>
                                <TableHead className="text-[11px]">{t("admin.orderSize")}</TableHead>
                                <TableHead className="text-[11px]">{t("admin.orderColor")}</TableHead>
                                <TableHead className="text-[11px] text-right">{t("admin.orderQty")}</TableHead>
                                <TableHead className="text-[11px] text-right">{t("admin.orderPrice")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any) => {
                                const product = item.products;
                                const colorVariants = product?.color_variants as any[] | undefined;
                                const matchedVariant = item.color && colorVariants?.find((v: any) => v.name === item.color);
                                const thumbUrl = item.zakeke_thumbnail_url || matchedVariant?.images?.[0] || product?.image_url || null;
                                const blog = blogByProduct[item.product_id];
                                const designUrl = product?.image_url || null;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs font-body">
                                      <div className="flex items-center gap-2">
                                        {thumbUrl ? (
                                          <img src={thumbUrl} alt={item.product_name} className="w-10 h-10 object-cover rounded border border-border shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 bg-muted rounded border border-border shrink-0" />
                                        )}
                                        <div className="flex flex-col min-w-0 gap-1">
                                          <span className="truncate">{item.product_name}</span>
                                          {blog && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] py-0 gap-1 w-fit">
                                                <Sparkles className="w-3 h-3" /> Svētku iedvesma
                                              </Badge>
                                              <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={blog.title}>{blog.title}</span>
                                              {designUrl && (
                                                <a
                                                  href={designUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  download
                                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                                >
                                                  <Download className="w-3 h-3" /> Dizains
                                                </a>
                                              )}
                                            </div>
                                          )}
                                          {item.zakeke_design_id && (
                                            item.is_bulk ? (
                                              <Badge className="bg-orange-100 text-orange-900 border-orange-300 text-[10px] py-0 w-fit">
                                                BULK: UNIFIED PRINT SIZE
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[10px] py-0 w-fit">
                                                INDIVIDUAL: SCALED PER SIZE
                                              </Badge>
                                            )
                                          )}
                                          <ZakekePrintFilesButton
                                            item={item}
                                            variant="inline"
                                            orderNumber={order.order_number}
                                            clientName={order.is_business ? (order.company_name ?? order.shipping_name) : (order.shipping_name ?? order.guest_email)}
                                          />
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.is_bulk && item.selected_sizes ? (
                                        <span className="font-medium text-orange-900">
                                          {Object.entries(item.selected_sizes as Record<string, number>).map(([s, n]) => `${n}×${s}`).join(", ")}
                                        </span>
                                      ) : (item.size || "—")}
                                    </TableCell>
                                    <TableCell className="text-xs">{item.color || "—"}</TableCell>
                                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-xs text-right font-medium">{item.unit_price.toFixed(2)} €</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredOrders.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground font-body">
            Rāda {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} no {filteredOrders.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ← Iepriekšējā
            </Button>
            <span className="text-xs font-body px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Nākamā →
            </Button>
          </div>
        </div>
      )}

      {invoiceOrder && (
        <Suspense fallback={null}>
          <InvoiceModal
            open={!!invoiceOrder}
            onOpenChange={(o) => !o && setInvoiceOrder(null)}
            order={invoiceOrder}
            onSaved={onRefresh}
          />
        </Suspense>
      )}

      <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Omniva sūtījuma diagnostika
            </DialogTitle>
            <DialogDescription>
              {diagOrder ? `Pasūtījums ${formatOrderNumber(diagOrder.order_number, diagOrder.id)} — ${diagOrder.shipping_name ?? ""}` : ""}
              <br />
              <span className="text-xs">Test režīms: pārbauda visus datus un parāda ko nosūtītu Omniva, bet reālu sūtījumu neveido.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {diagRunning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Pārbauda...
              </div>
            )}

            {diagSteps.map((s, i) => {
              const Icon = s.status === "ok" ? CheckCircle : s.status === "error" ? AlertCircle : Info;
              const colorClass =
                s.status === "ok" ? "text-green-600 bg-green-50 border-green-200"
                : s.status === "error" ? "text-destructive bg-destructive/5 border-destructive/30"
                : "text-blue-600 bg-blue-50 border-blue-200";
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${colorClass}`}>
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{s.step}</div>
                    {s.detail && <div className="font-mono text-[10px] break-all opacity-80 mt-0.5">{s.detail}</div>}
                  </div>
                </div>
              );
            })}

            {diagFatal && (
              <div className="flex items-start gap-2 p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Kļūda</div>
                  <div className="font-mono text-[10px] break-all">{diagFatal}</div>
                </div>
              </div>
            )}

            {diagPreview && (
              <div className="mt-3 p-3 rounded border border-border bg-muted/30">
                <div className="text-xs font-semibold mb-2">Sūtīšanas dati (preview):</div>
                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(diagPreview, null, 2)}
                </pre>
              </div>
            )}

            {!diagRunning && !diagFatal && diagSteps.length > 0 && (
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setDiagOpen(false)}>Aizvērt</Button>
                {diagOrder && !diagOrder.omniva_barcode && (
                  <Button
                    size="sm"
                    onClick={() => { setDiagOpen(false); createOmnivaShipment(diagOrder.id); }}
                    className="gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" /> Izveidot reālu sūtījumu
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
