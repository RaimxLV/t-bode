import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Euro, ShoppingBag, Mail, Phone, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("lv-LV", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtMoney = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export const CustomersList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "spent" | "orders">("recent");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-customers");
    if (error) {
      toast.error("Neizdevās ielādēt klientus");
      console.error(error);
      setLoading(false);
      return;
    }
    setCustomers(data?.customers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = customers;
    if (q) {
      arr = arr.filter(
        (c) =>
          c.email?.toLowerCase().includes(q) ||
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q),
      );
    }
    arr = [...arr];
    if (sort === "recent") arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === "spent") arr.sort((a, b) => b.total_spent - a.total_spent);
    if (sort === "orders") arr.sort((a, b) => b.orders_count - a.orders_count);
    return arr;
  }, [customers, query, sort]);

  const stats = useMemo(() => {
    const totalSpent = customers.reduce((s, c) => s + c.total_spent, 0);
    const withOrders = customers.filter((c) => c.orders_count > 0).length;
    const totalOrders = customers.reduce((s, c) => s + c.orders_count, 0);
    return { count: customers.length, totalSpent, withOrders, totalOrders };
  }, [customers]);

  const exportCsv = () => {
    const rows = [
      ["E-pasts", "Vārds", "Telefons", "Reģistrēts", "Pasūtījumi", "Kopā EUR", "Pēdējais pasūtījums"],
      ...filtered.map((c) => [
        c.email ?? "",
        c.full_name ?? "",
        c.phone ?? "",
        c.created_at,
        String(c.orders_count),
        c.total_spent.toFixed(2),
        c.last_order_at ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klienti_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Users className="w-4 h-4" /></div>
            <div>
              <p className="text-xl font-display">{stats.count}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body">Klienti kopā</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></div>
            <div>
              <p className="text-xl font-display">{stats.withOrders}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body">Ar pasūtījumiem</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></div>
            <div>
              <p className="text-xl font-display">{stats.totalOrders}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body">Pasūtījumi kopā</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><Euro className="w-4 h-4" /></div>
            <div>
              <p className="text-xl font-display">{fmtMoney(stats.totalSpent)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body">Ieņēmumi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Meklēt pēc e-pasta, vārda vai telefona…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="recent">Jaunākie</option>
            <option value="spent">Lielākie tērētāji</option>
            <option value="orders">Visvairāk pasūtījumu</option>
          </select>
          <Button variant="outline" onClick={load} disabled={loading} className="shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="shrink-0">
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-center py-12 font-body">Ielādē klientus…</p>
      ) : filtered.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-body">Nav atrasti klienti</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Card className="border border-border">
              <table className="w-full text-sm font-body">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Klients</th>
                    <th className="text-left p-3">Kontakti</th>
                    <th className="text-left p-3">Reģistrēts</th>
                    <th className="text-right p-3">Pasūtījumi</th>
                    <th className="text-right p-3">Kopā iztērēts</th>
                    <th className="text-left p-3">Pēdējais</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-semibold">{c.full_name || "—"}</p>
                      </td>
                      <td className="p-3">
                        <p className="flex items-center gap-1.5 text-xs"><Mail className="w-3 h-3 text-muted-foreground" />{c.email}</p>
                        {c.phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                      </td>
                      <td className="p-3 text-xs">{fmtDate(c.created_at)}</td>
                      <td className="p-3 text-right">
                        <Badge variant={c.orders_count > 0 ? "default" : "secondary"}>{c.orders_count}</Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{fmtMoney(c.total_spent)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{fmtDate(c.last_order_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <Card key={c.id} className="border border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{c.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <Badge variant={c.orders_count > 0 ? "default" : "secondary"} className="shrink-0">{c.orders_count}</Badge>
                  </div>
                  {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <span className="text-muted-foreground">Reģ: {fmtDate(c.created_at)}</span>
                    <span className="font-semibold">{fmtMoney(c.total_spent)}</span>
                  </div>
                  {c.last_order_at && (
                    <p className="text-[10px] text-muted-foreground">Pēd. pasūtījums: {fmtDate(c.last_order_at)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
