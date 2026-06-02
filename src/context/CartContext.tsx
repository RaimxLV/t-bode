import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const CART_STORAGE_KEY = "t-bode-cart";
const CART_TTL_MS = 1000 * 60 * 60 * 24;

type PersistedCart = {
  items: CartItem[];
  updatedAt: number;
};

const EMPTY_CART: PersistedCart = {
  items: [],
  updatedAt: 0,
};

const readStoredCart = (): PersistedCart => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return EMPTY_CART;

    const parsed = JSON.parse(saved) as CartItem[] | PersistedCart | null;

    if (Array.isArray(parsed)) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return EMPTY_CART;
    }

    if (parsed && Array.isArray(parsed.items)) {
      const isExpired = !parsed.updatedAt || Date.now() - parsed.updatedAt > CART_TTL_MS;
      if (isExpired) {
        localStorage.removeItem(CART_STORAGE_KEY);
        return EMPTY_CART;
      }
      return parsed;
    }

    localStorage.removeItem(CART_STORAGE_KEY);
    return EMPTY_CART;
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return EMPTY_CART;
  }
};

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  slug: string;
  designId?: string;
  designThumbnail?: string;
  /** All design preview image URLs from Zakeke (front, back, etc.). */
  designPreviews?: string[];
  /** Zakeke visitor code from the session that created this design — required to register the order with Zakeke. */
  zakekeVisitorCode?: string;
  /** Extra per-unit price added by Zakeke customization (already included in `price`). */
  customizationPrice?: number;
  /** Original product base price (before customization), kept for reference/admin display. */
  basePrice?: number;
  /**
   * Bulk-order size breakdown (Option A workflow).
   * Present only when the customer chose "Standardized logo size" and
   * filled in the size matrix. Keys are size labels, values are quantities.
   * When this is present, `quantity` equals the sum of all sizes and
   * `isBulk` is true. The single line uses one Zakeke designId for all sizes.
   */
  selectedSizes?: Record<string, number>;
  isBulk?: boolean;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartState, setCartState] = useState<PersistedCart>(() => {
    return readStoredCart();
  });
  const [isOpen, setIsOpen] = useState(false);
  const items = cartState.items;

  useEffect(() => {
    if (cartState.items.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
  }, [cartState]);

  const getKey = (id: string, size: string, color: string) => `${id}-${size}-${color}`;

  const addItem = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    const qty = item.quantity ?? 1;
    setCartState((prev) => {
      const nextUpdatedAt = Date.now();
      // Customized items (with a designId) and bulk items are always treated as
      // a unique cart line so multiple distinct designs / matrices of the same
      // product/size/color don't get merged and lose their designId / breakdown.
      if (item.designId || item.isBulk) {
        return {
          items: [...prev.items, { ...item, quantity: qty }],
          updatedAt: nextUpdatedAt,
        };
      }
      const idx = prev.items.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color &&
          !i.designId
      );
      if (idx >= 0) {
        const updated = [...prev.items];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
        return { items: updated, updatedAt: nextUpdatedAt };
      }
      return {
        items: [...prev.items, { ...item, quantity: qty }],
        updatedAt: nextUpdatedAt,
      };
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, size: string, color: string) => {
    setCartState((prev) => ({
      items: prev.items.filter((i) => !(i.productId === productId && i.size === size && i.color === color)),
      updatedAt: Date.now(),
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, size, color);
      return;
    }
    setCartState((prev) => ({
      items: prev.items.map((i) =>
        i.productId === productId && i.size === size && i.color === color ? { ...i, quantity } : i
      ),
      updatedAt: Date.now(),
    }));
  }, [removeItem]);

  const clearCart = useCallback(() => setCartState(EMPTY_CART), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
