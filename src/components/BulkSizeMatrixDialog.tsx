import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { getDiscountPercent, getEligibleQuantity, VOLUME_DISCOUNT_TIERS } from "@/lib/volumeDiscount";
import { useCart } from "@/context/CartContext";


interface BulkSizeMatrixDialogProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  unitPrice: number;
  sizes: string[];
  /** Called with the final size→qty map. Caller adds to cart. */
  onConfirm: (selectedSizes: Record<string, number>, totalQuantity: number) => void;
}

export const BulkSizeMatrixDialog = ({
  open,
  onClose,
  productName,
  unitPrice,
  sizes,
  onConfirm,
}: BulkSizeMatrixDialogProps) => {
  const { t } = useTranslation();
  const { items: cartItems } = useCart();
  const cartEligibleQty = getEligibleQuantity(cartItems);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(sizes.map((s) => [s, 0]))
  );

  const total = useMemo(
    () => Object.values(qtyMap).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0),
    [qtyMap]
  );
  const round2 = (n: number) => Math.round(n * 100) / 100;
  // Tier counts this matrix PLUS personalized items already in the cart.
  const tierQty = total + cartEligibleQty;
  const percent = getDiscountPercent(tierQty);
  const discountedUnit = percent > 0 ? round2(unitPrice * (1 - percent / 100)) : unitPrice;
  const fullPrice = round2(unitPrice * total);
  const totalPrice = round2(discountedUnit * total);
  const savings = round2(fullPrice - totalPrice);
  // Next tier the customer hasn't reached yet (tiers are sorted high→low).
  const nextTier = [...VOLUME_DISCOUNT_TIERS]
    .sort((a, b) => a.min - b.min)
    .find((tier) => tierQty < tier.min && tier.percent > percent);


  const update = (size: string, raw: string) => {
    const n = Math.max(0, Math.min(9999, parseInt(raw || "0", 10) || 0));
    setQtyMap((prev) => ({ ...prev, [size]: n }));
  };

  const handleConfirm = () => {
    if (total <= 0) return;
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(qtyMap)) {
      if (v > 0) cleaned[k] = v;
    }
    onConfirm(cleaned, total);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Layers className="w-5 h-5 text-primary" />
            {t("bulk.matrixTitle", "Norādiet daudzumus pa izmēriem")}
          </DialogTitle>
          <DialogDescription className="font-body text-sm">
            {t(
              "bulk.matrixDescription",
              "Viens dizains ar vienādu logo izmēru tiks drukāts uz visiem zemāk norādītajiem krekliem."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-body font-semibold">{productName}</p>
          <div className="grid grid-cols-[1fr_auto] gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {sizes.map((size) => (
              <div key={size} className="contents">
                <label
                  htmlFor={`bulk-size-${size}`}
                  className="flex items-center px-3 py-2 rounded-md bg-muted/40 border border-border font-body text-sm font-medium"
                >
                  {size}
                </label>
                <Input
                  id={`bulk-size-${size}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={9999}
                  value={qtyMap[size] ?? 0}
                  onChange={(e) => update(size, e.target.value)}
                  className="w-24 text-center font-body"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground font-body">
              {t("bulk.totalQty", "Kopā gabali")}:{" "}
              <span className="font-bold text-foreground">{total}</span>
              {percent > 0 && (
                <Badge className="ml-2 align-middle" variant="default">−{percent}%</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">
                {t("bulk.totalPrice", "Kopējā summa")}
              </div>
              <div className="flex items-baseline justify-end gap-2">
                {percent > 0 && (
                  <span className="text-sm font-body text-muted-foreground line-through">
                    €{fullPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-lg font-display font-bold text-primary">
                  €{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {percent > 0 && (
            <p className="text-xs font-body text-primary">
              {t("bulk.discountApplied", "Apjoma atlaide {{percent}}% piemērota — ietaupījums €{{savings}} (€{{unit}}/gab.)", {
                percent,
                savings: savings.toFixed(2),
                unit: discountedUnit.toFixed(2),
              })}
            </p>
          )}
          {nextTier && (
            <p className="text-xs font-body text-muted-foreground">
              {t("bulk.nextTierHint", "Pievieno vēl {{count}} gab., lai iegūtu {{percent}}% atlaidi.", {
                count: nextTier.min - total,
                percent: nextTier.percent,
              })}
            </p>
          )}
        </div>


        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="font-body">
            {t("common.cancel", "Atcelt")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={total <= 0}
            className="font-body"
            style={{ background: "var(--gradient-brand)" }}
          >
            {t("bulk.confirmAndAdd", "Apstiprināt un pievienot grozam")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};