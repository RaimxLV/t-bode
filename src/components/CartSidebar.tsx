import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export const CartSidebar = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalItems, totalPrice, subtotalPrice, totalSavings, getLineDiscount } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md bg-background border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <ShoppingBag className="w-5 h-5" />
            {t("cart.title")} ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="w-16 h-16 opacity-30" />
            <p className="font-body text-sm">{t("cart.empty")}</p>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("cart.continueShopping")}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="flex flex-col gap-4 py-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                    <Link to={`/product/${item.slug}`} onClick={() => setIsOpen(false)} className="w-20 h-20 rounded-md overflow-hidden bg-card border border-border flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.slug}`} onClick={() => setIsOpen(false)} className="font-body font-semibold text-sm truncate block hover:text-primary transition-colors">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-body">
                        {item.isBulk && item.selectedSizes
                          ? Object.entries(item.selectedSizes).map(([s, n]) => `${n}×${s}`).join(" · ") + ` · ${item.color}`
                          : `${item.size} · ${item.color}`}
                        {item.designId && <span className="ml-1 text-primary">✦ {t("cart.customized", "Personalizēts")}</span>}
                        {item.isBulk && <span className="ml-1 text-primary font-semibold">[BULK]</span>}
                      </p>
                      {(() => {
                        const d = getLineDiscount(item);
                        return d.percent > 0 ? (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs line-through text-muted-foreground font-body">
                              {d.originalLineTotal.toFixed(2).replace(".", ",")} €
                            </span>
                            <span className="text-sm font-bold font-body" style={{ color: "hsl(var(--primary))" }}>
                              {d.discountedLineTotal.toFixed(2).replace(".", ",")} €
                            </span>
                            <span className="text-[10px] font-bold font-body px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                              −{d.percent}%
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm font-bold font-body mt-1" style={{ color: "hsl(var(--primary))" }}>
                            {d.discountedLineTotal.toFixed(2).replace(".", ",")} €
                          </p>
                        );
                      })()}
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-body font-semibold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeItem(item.productId, item.size, item.color)} className="ml-auto w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <SheetFooter className="flex-col gap-3 pt-4 sm:flex-col">
              {totalSavings > 0 && (
                <>
                  <div className="flex items-center justify-between w-full text-sm font-body">
                    <span className="text-muted-foreground">{t("cart.subtotal", "Starpsumma")}:</span>
                    <span className="line-through text-muted-foreground">
                      {subtotalPrice.toFixed(2).replace(".", ",")} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full text-sm font-body">
                    <span className="text-primary font-semibold">{t("cart.savings", "Apjoma atlaide")}:</span>
                    <span className="text-primary font-semibold">
                      −{totalSavings.toFixed(2).replace(".", ",")} €
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between w-full">
                <span className="font-body font-semibold">{t("cart.total")}:</span>
                <span className="text-xl font-bold font-body" style={{ color: "hsl(var(--primary))" }}>
                  {totalPrice.toFixed(2).replace(".", ",")} €
                </span>
              </div>
              <Button className="w-full text-base py-6 font-body font-semibold" style={{ background: "var(--gradient-brand)" }} onClick={() => { setIsOpen(false); navigate("/checkout"); }}>
                {t("cart.checkout")}
              </Button>
              <Button variant="outline" className="w-full font-body" onClick={() => setIsOpen(false)}>
                {t("cart.continueShopping")}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
