import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to new order INSERTs and notifies the admin via callback.
 * The callback receives the new order row so the caller can show
 * a persistent in-app modal that must be acknowledged.
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
