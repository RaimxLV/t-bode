import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

const ORDER_STATUSES = [
  { value: "pending", key: "admin.orderStatuses.pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "confirmed", key: "admin.orderStatuses.confirmed", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "processing", key: "admin.orderStatuses.processing", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "shipped", key: "admin.orderStatuses.shipped", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "delivered", key: "admin.orderStatuses.delivered", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "cancelled", key: "admin.orderStatuses.cancelled", color: "bg-red-100 text-red-800 border-red-200" },
];

interface OrdersListProps {
  orders: any[];
  orderItems: Record<string, any[]>;
  loading: boolean;
  onRefresh: () => void;
}

export const OrdersList = ({ orders, orderItems, loading, onRefresh }: OrdersListProps) => {
  const { t } = useTranslation();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const getStatusInfo = (status: string) => ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else { toast.success(t("admin.statusUpdated")); onRefresh(); }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (filterDateFrom && new Date(order.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo) { const to = new Date(filterDateTo); to.setHours(23, 59, 59, 999); if (new Date(order.created_at) > to) return false; }
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label className="font-body text-xs text-muted-foreground">{t("admin.filterStatus")}</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("admin.filterAll")}</SelectItem>
              {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateFrom")}</Label>
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-[150px] text-xs mt-1" />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateTo")}</Label>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-[150px] text-xs mt-1" />
        </div>
        {(filterStatus !== "all" || filterDateFrom || filterDateTo) && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
            <X className="w-3 h-3 mr-1" /> {t("admin.clearFilters")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingOrders")}</p>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20"><p className="text-muted-foreground font-body">{t("admin.noOrders")}</p></div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const items = orderItems[order.id] || [];
            return (
              <Card key={order.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-body font-semibold text-sm">#{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold border ${statusInfo.color}`}>{t(statusInfo.key)}</span>
                        <span className="text-xs text-muted-foreground font-body">{new Date(order.created_at).toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-body space-y-1">
                        {order.shipping_name && <p>👤 {order.shipping_name} · {order.shipping_phone}</p>}
                        {order.shipping_address && <p>📍 {order.shipping_address}, {order.shipping_city} {order.shipping_zip}</p>}
                        {order.omniva_pickup_point && <p>📦 Omniva: {order.omniva_pickup_point}</p>}
                        {order.notes && <p>📝 {order.notes}</p>}
                      </div>
                      {items.length > 0 && (
                        <div className="mt-3 border-t border-border pt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">{t("admin.orderProduct")}</TableHead>
                                <TableHead className="text-xs">{t("admin.orderSize")}</TableHead>
                                <TableHead className="text-xs">{t("admin.orderColor")}</TableHead>
                                <TableHead className="text-xs text-right">{t("admin.orderQty")}</TableHead>
                                <TableHead className="text-xs text-right">{t("admin.orderPrice")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-xs font-body">{item.product_name}</TableCell>
                                  <TableCell className="text-xs">{item.size || "—"}</TableCell>
                                  <TableCell className="text-xs">{item.color || "—"}</TableCell>
                                  <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-xs text-right">{item.unit_price.toFixed(2)} €</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[140px]">
                      <span className="font-body font-bold text-lg">{Number(order.total).toFixed(2)} €</span>
                      <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v)}>
                        <SelectTrigger className="w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};