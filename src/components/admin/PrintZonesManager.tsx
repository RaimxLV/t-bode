import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, X, Pencil, Image as ImageIcon } from "lucide-react";

type Area = { x: number; y: number; w: number; h: number };
const DEFAULT: Area = { x: 0.3, y: 0.25, w: 0.4, h: 0.45 };

type Row = {
  id: string;
  name: string;
  name_lv: string | null;
  category: string;
  image_url: string | null;
  color_variants: { name: string; hex: string; images: string[] }[];
  print_area: Area | null;
};

export function PrintZonesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,name_lv,category,image_url,color_variants,print_area")
      .eq("customizable", true)
      .eq("is_draft", false)
      .order("name");
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []).map((r) => ({
      ...r,
      color_variants: Array.isArray(r.color_variants) ? r.color_variants : [],
      print_area: r.print_area ?? null,
    })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async (id: string, area: Area) => {
    const { error } = await supabase.from("products").update({ print_area: area }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Print zona saglabāta");
    setEditing(null);
    await load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm font-body text-muted-foreground">
          Šeit iestati print zonu (kur dizains tiks uzlikts) katram customizable produktam. Autopilot kampaņas izmantos šo zonu, lai automātiski uzliktu dizainu uz katras krāsas bildes.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((p) => {
          const preview = p.color_variants[0]?.images?.[0] ?? p.image_url ?? "/placeholder.svg";
          const pa = p.print_area ?? DEFAULT;
          const set = !!p.print_area;
          return (
            <Card key={p.id} className="border border-border overflow-hidden">
              <div className="relative aspect-square bg-white">
                <img src={preview} alt={p.name} className="w-full h-full object-contain" />
                <div className="absolute border-2 border-primary/80 bg-primary/10 pointer-events-none"
                  style={{ left: `${pa.x * 100}%`, top: `${pa.y * 100}%`, width: `${pa.w * 100}%`, height: `${pa.h * 100}%` }} />
                {!set && (
                  <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">default</Badge>
                )}
              </div>
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-body font-medium truncate flex-1">{p.name_lv || p.name}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">{p.category}</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full h-7 text-[11px]" onClick={() => setEditing(p)}>
                  <Pencil className="w-3 h-3 mr-1.5" />
                  {set ? "Rediģēt zonu" : "Iestatīt zonu"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Editor
          row={editing}
          onCancel={() => setEditing(null)}
          onSave={(a) => save(editing.id, a)}
        />
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function Editor({ row, onCancel, onSave }: { row: Row; onCancel: () => void; onSave: (a: Area) => void }) {
  const [area, setArea] = useState<Area>(row.print_area ?? DEFAULT);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; orig: Area } | null>(null);
  const preview = row.color_variants[0]?.images?.[0] ?? row.image_url ?? "/placeholder.svg";

  function down(mode: "move" | "resize", e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, orig: { ...area } };
  }
  function move(e: React.PointerEvent) {
    if (!dragRef.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.sx) / r.width;
    const dy = (e.clientY - dragRef.current.sy) / r.height;
    const o = dragRef.current.orig;
    if (dragRef.current.mode === "move") {
      setArea({ x: clamp(o.x + dx, 0, 1 - o.w), y: clamp(o.y + dy, 0, 1 - o.h), w: o.w, h: o.h });
    } else {
      setArea({ x: o.x, y: o.y, w: clamp(o.w + dx, 0.05, 1 - o.x), h: clamp(o.h + dy, 0.05, 1 - o.y) });
    }
  }
  function up() { dragRef.current = null; }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <Card className="w-full max-w-2xl bg-background" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg">Print zona — {row.name_lv || row.name}</h3>
              <p className="text-xs text-muted-foreground font-body">Velc kasti, lai pārvietotu. Velc apakšējo labo stūri, lai mainītu izmēru.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
          </div>

          <div ref={containerRef} className="relative w-full aspect-square bg-white select-none touch-none rounded-lg overflow-hidden border border-border">
            <img src={preview} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            <div
              className="absolute border-2 border-primary bg-primary/15 cursor-move"
              style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.w * 100}%`, height: `${area.h * 100}%` }}
              onPointerDown={(e) => down("move", e)} onPointerMove={move} onPointerUp={up}
            >
              <div
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-sm cursor-se-resize border-2 border-background z-10"
                onPointerDown={(e) => down("resize", e)} onPointerMove={move} onPointerUp={up}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground font-body">
            x={area.x.toFixed(2)} · y={area.y.toFixed(2)} · w={area.w.toFixed(2)} · h={area.h.toFixed(2)}
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Atcelt</Button>
            <Button onClick={() => onSave(area)} className="bg-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> Saglabāt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}