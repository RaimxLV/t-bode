import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Archive, Inbox, TrendingUp, Clock, CheckCircle, ShoppingCart, Euro, ChevronDown, ChevronUp, Search, Trash2, FileText, Building2, Truck, Download, Loader2, Landmark, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const ORDER_STATUSES = [
  { value: "pending", key: "admin.orderStatuses.pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  { value: "confirmed", key: "admin.orderStatuses.confirmed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
  { value: "processing", key: "admin.orderStatuses.processing", color: "bg-purple-100 text-purple-800 border-purple-200", icon: TrendingUp },
  { value: "shipped", key: "admin.orderStatuses.shipped", color: "bg-cyan-100 text-cyan-800 border-cyan-200", icon: ShoppingCart },
  { value: "delivered", key: "admin.orderStatuses.delivered", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  { value: "cancelled", key: "admin.orderStatuses.cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: X },
];

const ARCHIVED_STATUSES = ["delivered", "cancelled"];

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
  const [omnivaLoading, setOmnivaLoading] = useState<Record<string, "create" | "label" | null>>({});

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
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `omniva-${barcode}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      toast.error(`${t("admin.omnivaLabelError")}: ${err.message || err}`);
    } finally {
      setOmnivaLoading((p) => ({ ...p, [orderId]: null }));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else { toast.success(t("admin.statusUpdated")); onRefresh(); }
  };

  const markAsPaid = async (orderId: string) => {
    if (!confirm(t("admin.markPaidConfirm", "Apstiprināt, ka maksājums ir saņemts bankā?"))) return;
    const { error } = await supabase
      .from("orders")
      .update({
        status: "confirmed" as any,
        manually_paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else { toast.success(t("admin.markedAsPaid", "Pasūtījums atzīmēts kā apmaksāts")); onRefresh(); }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Vai tiešām vēlaties dzēst šo pasūtījumu? Šī darbība ir neatgriezeniska.")) return;
    // Delete order items first, then the order
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) toast.error("Kļūda dzēšot pasūtījumu: " + error.message);
    else { toast.success("Pasūtījums dzēsts"); setExpandedOrder(null); onRefresh(); }
  };

  const activeOrders = useMemo(() => orders.filter(o => !ARCHIVED_STATUSES.includes(o.status)), [orders]);
  const archivedOrders = useMemo(() => orders.filter(o => ARCHIVED_STATUSES.includes(o.status)), [orders]);
  const currentOrders = showArchive ? archivedOrders : activeOrders;

  const stats = useMemo(() => {
    const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total), 0);
    const pendingCount = orders.filter(o => o.status === "pending").length;
    const activeCount = orders.filter(o => ["confirmed", "processing", "shipped"].includes(o.status)).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = orders.filter(o => o.status !== "cancelled" && new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + Number(o.total), 0);
    return { totalRevenue, pendingCount, activeCount, monthRevenue };
  }, [orders]);

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
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const availableStatuses = showArchive
    ? ORDER_STATUSES.filter(s => ARCHIVED_STATUSES.includes(s.value))
    : ORDER_STATUSES.filter(s => !ARCHIVED_STATUSES.includes(s.value));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Euro} label="Kopējie ieņēmumi" value={`${stats.totalRevenue.toFixed(2)} €`} accent="bg-green-50 text-green-600" />
        <StatCard icon={TrendingUp} label="Šī mēneša ieņēmumi" value={`${stats.monthRevenue.toFixed(2)} €`} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={Clock} label="Gaida apstiprinājumu" value={stats.pendingCount} accent="bg-yellow-50 text-yellow-600" />
        <StatCard icon={ShoppingCart} label="Aktīvie pasūtījumi" value={stats.activeCount} accent="bg-purple-50 text-purple-600" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={!showArchive ? "default" : "outline"} size="sm" onClick={() => { setShowArchive(false); setFilterStatus("all"); }} className="gap-1.5 text-xs">
            <Inbox className="w-3.5 h-3.5" /> Aktīvie <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{activeOrders.length}</Badge>
          </Button>
          <Button variant={showArchive ? "default" : "outline"} size="sm" onClick={() => { setShowArchive(true); setFilterStatus("all"); }} className="gap-1.5 text-xs">
            <Archive className="w-3.5 h-3.5" /> Arhīvs <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{archivedOrders.length}</Badge>
          </Button>
        </div>
        <span className="text-xs text-muted-foreground font-body">Kopā: {orders.length} pasūtījumi</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Meklēt pēc Nr., vārda, telefona..."
            className="w-48 sm:w-56 pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-xs font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">Statuss</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("admin.filterAll")}</SelectItem>
              {availableStatuses.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateFrom")}</Label>
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-[140px] text-xs mt-1" />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateTo")}</Label>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-[140px] text-xs mt-1" />
        </div>
        {(filterStatus !== "all" || filterDateFrom || filterDateTo || searchQuery) && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); }}>
            <X className="w-3 h-3 mr-1" /> Notīrīt
          </Button>
        )}
      </div>

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
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const items = orderItems[order.id] || [];
            const isExpanded = expandedOrder === order.id;
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={order.id} className={`border transition-all ${isExpanded ? "border-primary/30 shadow-sm" : "border-border hover:border-primary/20"}`}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full p-3 sm:p-4 flex items-center gap-3 text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body font-semibold text-sm">{formatOrderNumber(order.order_number, order.id)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border ${statusInfo.color}`}>
                          {t(statusInfo.key)}
                        </span>
                        {order.is_business && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                            B2B
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {(order.is_business ? order.company_name : order.shipping_name) && (
                          <span className="text-xs text-muted-foreground font-body truncate">
                            {order.is_business ? order.company_name : order.shipping_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-body">
                          {new Date(order.created_at).toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-body font-bold text-sm sm:text-base">{Number(order.total).toFixed(2)} €</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length} preces</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

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
                          {order.omniva_pickup_point && <p className="text-xs text-muted-foreground font-body">📦 Omniva: {order.omniva_pickup_point}</p>}
                          {order.guest_email && <p className="text-xs text-muted-foreground font-body">✉️ {order.guest_email}</p>}
                          {order.notes && <p className="text-xs text-muted-foreground font-body">📝 {order.notes}</p>}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <p className="text-xs font-semibold font-body text-foreground">Mainīt statusu</p>
                          <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v)}>
                            <SelectTrigger className="w-[160px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 mt-1"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Dzēst pasūtījumu
                          </Button>
                        </div>
                      </div>

                      {/* Omniva shipment block */}
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <p className="text-xs font-semibold font-body text-foreground flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> {t("admin.omnivaShipment")}
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
                          </div>
                        ) : (
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
                        )}
                      </div>

                      {items.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <Table>
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
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs font-body">
                                      <div className="flex items-center gap-2">
                                        {thumbUrl ? (
                                          <img src={thumbUrl} alt={item.product_name} className="w-10 h-10 object-cover rounded border border-border shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 bg-muted rounded border border-border shrink-0" />
                                        )}
                                        <span className="truncate">{item.product_name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{item.size || "—"}</TableCell>
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
    </div>
  );
};
