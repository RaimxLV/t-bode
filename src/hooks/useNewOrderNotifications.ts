import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to new order INSERTs and notifies the admin in real time.
 * - Refreshes the orders list via onNewOrder
 * - Shows an in-app toast
 * - Shows a browser/desktop notification (works as PWA)
 * - Plays a short beep
 */
export function useNewOrderNotifications(enabled: boolean, onNewOrder: () => void) {
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!enabled) return;

    const playBeep = () => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.value = 0.15;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.25);
        setTimeout(() => ctx.close(), 400);
      } catch { /* ignore */ }
    };

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order: any = payload.new;
          const total = Number(order?.total ?? 0).toFixed(2);
          const who = order?.guest_email || order?.shipping_name || "Klients";
          const body = `${who} — ${total} EUR`;

          onNewOrderRef.current();
          toast.success("Jauns pasūtījums!", { description: body });
          playBeep();

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const n = new Notification("Jauns pasūtījums — T-Bode", {
                body,
                icon: "/icon-192.png",
                badge: "/favicon-32.png",
                tag: `order-${order?.id ?? Date.now()}`,
              });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch { /* ignore */ }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
