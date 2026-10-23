import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminMfaGate } from "@/components/security/AdminMfaGate";
import { Seo } from "@/components/Seo";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { canMarkOrderManuallyPaid } from "@/lib/manualOrderPayment";
import type { Tables } from "@/integrations/supabase/types";

type PaymentOrder = Pick<Tables<"orders">, "id" | "order_number" | "status" | "total" | "payment_method" | "manually_paid_at" | "montonio_payment_status">;

export default function OrderPayments() {
  const { user, loading, isAdmin, isWhitelisted, adminLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const load = async () => {
    setFetching(true);
    const { data, error } = await supabase.from("orders")
      .select("id,order_number,status,total,payment_method,manually_paid_at,montonio_payment_status")
      .order("order_number", { ascending: false }).limit(1000);
    setLoadError(!!error);
    if (error) toast.error("Neizdevās ielādēt pasūtījumus");
    else setOrders(data ?? []);
    setFetching(false);
  };
  useEffect(() => {
    if (loading || adminLoading || !user) return;
    let cancelled = false;
    void supabase.rpc("has_role", { _user_id: user.id, _role: "worker" }).then(({ data, error }) => {
      if (!cancelled) setAllowed(isAdmin || isWhitelisted || (!error && !!data));
    });
    return () => { cancelled = true; };
  }, [user, loading, adminLoading, isAdmin, isWhitelisted]);
  useEffect(() => { if (allowed) void load(); }, [allowed]);
  const markPaid = async (order: PaymentOrder) => {
    if (!confirm(`Apstiprināt, ka pasūtījuma #${order.order_number} maksājums (${Number(order.total).toFixed(2)} €) ir saņemts bankā?`)) return;
    setBusy(order.id);
    try {
      const { data, error } = await supabase.rpc("mark_order_manually_paid", { _order_id: order.id });
      if (error) throw error;
      if (data) toast.success("Pasūtījums atzīmēts kā apmaksāts");
      else toast.info("Pasūtījums jau atzīmēts kā apmaksāts vai vairs nav pieejams");
      await load();
    } catch { toast.error("Neizdevās atzīmēt apmaksu"); }
    finally { setBusy(null); }
  };
  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (allowed === false) return <Navigate to="/profile" replace />;
  if (loading || adminLoading || allowed === null) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  return <AdminMfaGate><main className="min-h-screen bg-background text-foreground p-4 sm:p-8">
    <Seo title="Pasūtījumu apmaksa — T-Bode" description="Pasūtījumu apmaksas pārvaldība" />
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="outline" asChild><Link to="/profile">Mans konts</Link></Button>
      <h1 className="font-display text-3xl">Pasūtījumu apmaksa</h1>
      <div className="flex gap-2"><Input aria-label="Meklēt pasūtījuma numuru" placeholder="Pasūtījuma numurs" value={search} onChange={e => setSearch(e.target.value)} /><Button variant="outline" onClick={() => void load()} disabled={fetching}>Atjaunot</Button></div>
      {loadError && <p role="alert">Pasūtījumu saraksts nav ielādēts. Mēģini vēlreiz.</p>}
      {orders.filter(o => String(o.order_number).includes(search.replace(/^#/, "").trim())).map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <div><p className="font-semibold">#{order.order_number} · {Number(order.total).toFixed(2)} €</p><p className="text-sm text-muted-foreground">{order.payment_method}</p></div>
        {canMarkOrderManuallyPaid(order) ? <Button onClick={() => void markPaid(order)} disabled={busy !== null}><BadgeCheck className="mr-2 h-4 w-4" />Atzīmēt kā apmaksātu</Button> : <span className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4" />Apmaksāts</span>}
      </div>)}
    </div>
  </main></AdminMfaGate>;
}