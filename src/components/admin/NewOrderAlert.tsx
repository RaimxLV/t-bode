import { useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell } from "lucide-react";

export type NewOrderInfo = {
  id: string;
  total?: number | string | null;
  guest_email?: string | null;
  shipping_name?: string | null;
  order_number?: string | null;
};

/**
 * Persistent, non-auto-dismissing popup for new orders.
 * Plays a repeating beep until the admin clicks OK.
 */
export const NewOrderAlert = ({
  orders,
  onAcknowledge,
}: {
  orders: NewOrderInfo[];
  onAcknowledge: () => void;
}) => {
  const open = orders.length > 0;
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!open) return;

    // Soft two-note chime, played once.
    const playChime = () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        const playNote = (freq: number, startOffset: number, duration: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          const start = ctx.currentTime + startOffset;
          const end = start + duration;
          // Gentle envelope: fade in/out so it sounds soft, not piercing.
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.08, start + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, end);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(start);
          o.stop(end + 0.02);
        };
        // C5 → E5, soft mallet-like chime
        playNote(523.25, 0, 0.45);
        playNote(659.25, 0.18, 0.55);
      } catch { /* ignore */ }
    };

    playChime();

    // Try to focus the window so the modal is visible
    try { window.focus(); } catch { /* ignore */ }
  }, [open]);

  const latest = orders[orders.length - 1];
  const who = latest?.guest_email || latest?.shipping_name || "Klients";
  const total = Number(latest?.total ?? 0).toFixed(2);
  const orderNo = latest?.order_number ? `#${latest.order_number}` : "";

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-primary/60">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-2xl">
            <Bell className="w-6 h-6 text-primary animate-pulse" />
            Jauns pasūtījums! {orders.length > 1 ? `(${orders.length})` : ""}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {orderNo && <span className="block font-semibold text-foreground">{orderNo}</span>}
            <span className="block">{who}</span>
            <span className="block text-lg font-display text-primary">{total} EUR</span>
            {orders.length > 1 && (
              <span className="block mt-2 text-sm">
                Ienākuši {orders.length} jauni pasūtījumi kopš pēdējās apstiprināšanas.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onAcknowledge}>Apstiprināt</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
