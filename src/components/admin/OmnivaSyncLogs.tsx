import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Truck } from "lucide-react";

type SyncLog = {
  id: string;
  ran_at: string;
  total: number;
  updated: number;
  rate_limited: boolean;
  error_count: number;
  alert_sent: boolean;
  deliveries: Array<{ barcode: string; order_number: number | null; status: string; event?: string }>;
  errors: Array<{ barcode: string; order_number: number | null; status?: number; message: string }>;
};

const fmt = (s: string) => new Date(s).toLocaleString("lv-LV", { dateStyle: "short", timeStyle: "short" });

export const OmnivaSyncLogs = () => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("omniva_sync_logs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Neizdevās ielādēt žurnālus: " + error.message);
    else setLogs((data as unknown as SyncLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("omniva-tracking-sync");
      if (error) toast.error("Sinhronizācija neizdevās: " + error.message);
      else toast.success("Sinhronizācija palaista — atjaunot pēc brīža.");
    } finally {
      setRunning(false);
      setTimeout(load, 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Omniva sinhronizācija</h2>
          <p className="text-xs text-muted-foreground font-body">Notiek automātiski ik 30 min. Brīdinājuma e-pasts uz Ofsetadruka@gmail.com pie kļūdām vai rate-limit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atjaunot
          </Button>
          <Button size="sm" onClick={runNow} disabled={running}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${running ? "animate-spin" : ""}`} /> Palaist tagad
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12 font-body">Ielādē…</p>
      ) : logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground font-body">Vēl nav žurnālu. Pirmā sinhronizācija notiks tuvākajā cron iterācijā.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isErr = log.error_count > 0 || log.rate_limited;
            const isOpen = expanded === log.id;
            return (
              <Card key={log.id} className={isErr ? "border-destructive/40" : ""}>
                <CardContent className="p-4">
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full flex flex-wrap items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isErr
                        ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                        : <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {fmt(log.ran_at)}
                        </div>
                        <div className="text-xs text-muted-foreground font-body">
                          Pārbaudīti {log.total} · Atjaunoti {log.updated}
                          {log.error_count > 0 && ` · Kļūdas ${log.error_count}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {log.rate_limited && <Badge variant="destructive">Rate-limit</Badge>}
                      {log.error_count > 0 && <Badge variant="destructive">{log.error_count} kļūda(s)</Badge>}
                      {log.updated > 0 && <Badge variant="secondary">+{log.updated} atjaunots</Badge>}
                      {log.alert_sent && <Badge variant="outline">📧 brīdinājums nosūtīts</Badge>}
                      {!isErr && log.updated === 0 && log.total > 0 && <Badge variant="outline">Bez izmaiņām</Badge>}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {log.deliveries.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Atjauninājumi ({log.deliveries.length})</h4>
                          <div className="space-y-1">
                            {log.deliveries.map((d, i) => (
                              <div key={i} className="flex flex-wrap items-center gap-2 text-xs font-body bg-muted/40 rounded px-2 py-1.5">
                                <span className="font-mono">{d.barcode}</span>
                                {d.order_number != null && <Badge variant="outline" className="text-[10px]">#{String(d.order_number).padStart(5, "0")}</Badge>}
                                <span className="text-muted-foreground">→</span>
                                <Badge variant={d.status === "delivered" ? "default" : "secondary"}>{d.status}</Badge>
                                {d.event && <span className="text-muted-foreground truncate">{d.event}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.errors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-destructive">Kļūdas ({log.errors.length})</h4>
                          <div className="space-y-1">
                            {log.errors.map((e, i) => (
                              <div key={i} className="text-xs font-body bg-destructive/5 border border-destructive/20 rounded px-2 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{e.barcode || "—"}</span>
                                  {e.order_number != null && <Badge variant="outline" className="text-[10px]">#{String(e.order_number).padStart(5, "0")}</Badge>}
                                  {e.status != null && <Badge variant="destructive" className="text-[10px]">HTTP {e.status}</Badge>}
                                </div>
                                <p className="text-destructive mt-1 break-all">{e.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.deliveries.length === 0 && log.errors.length === 0 && (
                        <p className="text-xs text-muted-foreground font-body">Nav detalizētu ierakstu.</p>
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