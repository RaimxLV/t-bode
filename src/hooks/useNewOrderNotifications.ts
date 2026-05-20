import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const isPaid = (o: any): boolean => {
  if (!o) return false;
  if (o.manually_paid_at) return true;
  if ((o.montonio_payment_status ?? "").toString().toUpperCase() === "PAID") return true;
  return ["confirmed", "processing", "shipped", "delivered"].includes(o.status ?? "");
};

/**
 * Subscribes to new order INSERTs and notifies the admin via callback.
 * Also listens for UPDATEs that flip an order into a "paid" state
 * (e.g. Montonio webhook confirms payment after the initial INSERT).
 * Unpaid INSERTs are forwarded too so callers can refresh silently — the
 * caller decides whether to show a user-facing notification.
 */
export function useNewOrderNotifications(enabled: boolean, onNewOrder: (order: any) => void) {
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          onNewOrderRef.current(payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          // Fire the alert when an order transitions from unpaid → paid.
          // This is how Montonio/bank-transfer orders surface to the admin
          // (they are inserted as pending, then later marked paid).
          if (!isPaid(payload.old) && isPaid(payload.new)) {
            onNewOrderRef.current(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
