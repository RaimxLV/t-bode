import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type RangePreset = "24h" | "7d" | "30d" | "all";

function rangeStart(preset: RangePreset): string | null {
  const now = Date.now();
  if (preset === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (preset === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (preset === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  dlq: "bg-destructive/15 text-destructive border-destructive/30",
  suppressed: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

export const EmailLog = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangePreset>("7d");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    const start = rangeStart(range);
    if (start) q = q.gte("created_at", start);
    const { data, error } = await q;
    if (error) toast.error("Neizdevās ielādēt e-pastu žurnālu");
    else setRows((data ?? []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  // Deduplicate by message_id — keep latest row per message_id (rows already sorted DESC by created_at).
  const dedupedAll = useMemo(() => {
    const seen = new Set<string>();
    const result: LogRow[] = [];
    for (const r of rows) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(r);
    }
    return result;
  }, [rows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    dedupedAll.forEach((r) => set.add(r.template_name));
    return Array.from(set).sort();
  }, [dedupedAll]);

  const filtered = useMemo(() => {
    return dedupedAll.filter((r) => {
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [dedupedAll, templateFilter, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, sent: 0, failed: 0, suppressed: 0 };
    filtered.forEach((r) => {
      if (r.status === "sent") s.sent++;
      else if (r.status === "failed" || r.status === "dlq") s.failed++;
      else if (r.status === "suppressed") s.suppressed++;
    });
    return s;
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [templateFilter, statusFilter, range]);

  const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) => (
    <Card className="border border-border">
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xl font-display">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-body uppercase tracking-wide">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header + refresh */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-display">E-pastu vēsture</h2>
          <p className="text-xs text-muted-foreground font-body">Visi nosūtītie sistēmas e-pasti (dedupēti pēc message_id)</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atjaunot
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* Time range */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-body w-20">Periods:</span>
            {([
              { v: "24h", l: "24h" },
              { v: "7d", l: "7 dienas" },
              { v: "30d", l: "30 dienas" },
              { v: "all", l: "Visi" },
            ] as { v: RangePreset; l: string }[]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setRange(opt.v)}
                className={`px-3 py-1 rounded-full text-xs font-body border transition-colors ${
                  range === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {/* Template + status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">Veidne</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Visas veidnes</option>
                {templates.map((tpl) => (
                  <option key={tpl} value={tpl}>{tpl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">Statuss</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Visi</option>
                <option value="sent">Nosūtīts</option>
                <option value="failed">Neizdevās</option>
                <option value="suppressed">Bloķēts</option>
                <option value="pending">Apstrādē</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Mail} label="Kopā" value={stats.total} accent="bg-primary/10 text-primary" />
        <StatCard icon={CheckCircle2} label="Nosūtīts" value={stats.sent} accent="bg-green-500/10 text-green-600" />
        <StatCard icon={XCircle} label="Neizdevās" value={stats.failed} accent="bg-destructive/10 text-destructive" />
        <StatCard icon={AlertTriangle} label="Bloķēts" value={stats.suppressed} accent="bg-yellow-500/10 text-yellow-600" />
      </div>

      {/* Log table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground font-body">Ielādē...</div>
          ) : pageRows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body">Nav neviena ieraksta izvēlētajā periodā.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Veidne</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Saņēmējs</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Statuss</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Laiks</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 align-top">
                        <span className="font-mono text-xs">{r.template_name}</span>
                      </td>
                      <td className="px-3 py-2 align-top max-w-[220px] truncate" title={r.recipient_email}>
                        {r.recipient_email}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge variant="outline" className={`${STATUS_COLORS[r.status] ?? STATUS_COLORS.pending} text-xs font-medium`}>
                          {r.status}
                        </Badge>
                        {r.error_message && (
                          <p className="text-[11px] text-destructive mt-1 max-w-[280px] truncate" title={r.error_message}>
                            {r.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("lv-LV", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <span className="text-xs text-muted-foreground font-body">
                Lapa {page + 1} / {totalPages} · {filtered.length} ieraksti
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  ‹
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};