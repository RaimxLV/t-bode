import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface WishlistContextType {
  productIds: Set<string>;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProductIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id);
    setProductIds(new Set((data ?? []).map((r: any) => r.product_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isInWishlist = useCallback((productId: string) => productIds.has(productId), [productIds]);

  const toggleWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (!user) return false;
    const exists = productIds.has(productId);
    if (exists) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
      setProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      return false;
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
      setProductIds((prev) => new Set(prev).add(productId));
      return true;
    }
  }, [user, productIds]);

  return (
    <WishlistContext.Provider value={{ productIds, loading, isInWishlist, toggleWishlist, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
