import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, ShoppingBag, Calendar } from "lucide-react";

interface ProductStatsProps {
  orders: any[];
  orderItems: Record<string, any[]>;
}

const MONTHS_LV = ["Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs", "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris"];

export const ProductStats = ({ orders, orderItems }: ProductStatsProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach((o) => years.add(new Date(o.created_at).getFullYear()));
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, currentYear]);

  // Aggregate product stats
  const { productTotals, monthlyData, yearTotal, yearRevenue } = useMemo(() => {
    const year = Number(selectedYear);
    const validOrders = orders.filter((o) => o.status !== "cancelled" && new Date(o.created_at).getFullYear() === year);
    const validOrderIds = new Set(validOrders.map((o) => o.id));

    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    const monthly: { month: number; qty: number; revenue: number; orders: number }[] = Array.from({ length: 12 }, (_, i) => ({ month: i, qty: 0, revenue: 0, orders: 0 }));

    // Count orders per month
    validOrders.forEach((o) => {
      const m = new Date(o.created_at).getMonth();
      monthly[m].orders++;
      monthly[m].revenue += Number(o.total);
    });

    // Aggregate items
    Object.entries(orderItems).forEach(([orderId, items]) => {
      if (!validOrderIds.has(orderId)) return;
      const order = validOrders.find((o) => o.id === orderId);
      const m = order ? new Date(order.created_at).getMonth() : 0;
      items.forEach((item: any) => {
        const key = item.product_name;
        if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 };
        productMap[key].qty += item.quantity;
        productMap[key].revenue += item.unit_price * item.quantity;
        monthly[m].qty += item.quantity;
      });
    });

    const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty);
    const totalQty = sorted.reduce((s, p) => s + p.qty, 0);
    const totalRev = validOrders.reduce((s, o) => s + Number(o.total), 0);

    return { productTotals: sorted, monthlyData: monthly, yearTotal: totalQty, yearRevenue: totalRev };
  }, [orders, orderItems, selectedYear]);

  const maxQty = Math.max(...monthlyData.map((m) => m.qty), 1);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Year selector + summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-display">Produktu statistika</h3>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-xl font-display">{yearTotal}</p>
            <p className="text-[10px] text-muted-foreground font-body">Pārdoti produkti</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-xl font-display">{yearRevenue.toFixed(2)} €</p>
            <p className="text-[10px] text-muted-foreground font-body">Gada ieņēmumi</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-xl font-display">{orders.filter((o) => o.status !== "cancelled" && new Date(o.created_at).getFullYear() === Number(selectedYear)).length}</p>
            <p className="text-[10px] text-muted-foreground font-body">Pasūtījumi</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs font-semibold font-body mb-3">Mēnešu statistika ({selectedYear})</p>
          <div className="space-y-1.5">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-body text-muted-foreground w-16 shrink-0 truncate">{MONTHS_LV[i].slice(0, 3)}</span>
                <div className="flex-1 h-5 bg-muted/50 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-primary/80 rounded-sm transition-all duration-300"
                    style={{ width: `${(m.qty / maxQty) * 100}%` }}
                  />
                  {m.qty > 0 && (
                    <span className="absolute right-1.5 top-0.5 text-[9px] font-body font-medium text-foreground">
                      {m.qty} preces · {m.revenue.toFixed(0)} €
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top products table */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs font-semibold font-body mb-3">
            <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
            Populārākie produkti ({selectedYear})
          </p>
          {productTotals.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body text-center py-8">Nav datu par šo gadu</p>
          ) : (
            <div className="space-y-2">
              {productTotals.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs font-body truncate">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{p.qty} gab.</Badge>
                  <span className="text-xs font-body font-medium text-muted-foreground shrink-0 w-16 text-right">{p.revenue.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
