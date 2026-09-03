import type { CartItem } from "@/context/CartContext";

/**
 * Volume discount tiers for personalized products only.
 * Based on the quantity of a single line (BULK lines already represent the
 * combined quantity across sizes for one customized design).
 */
export const VOLUME_DISCOUNT_TIERS = [
  { min: 20, percent: 30 },
  { min: 10, percent: 15 },
  { min: 5, percent: 10 },
] as const;

export const getDiscountPercent = (qty: number): number => {
  for (const tier of VOLUME_DISCOUNT_TIERS) {
    if (qty >= tier.min) return tier.percent;
  }
  return 0;
};

/**
 * A cart item is eligible for the volume discount only when it is a
 * customized product — either a Zakeke-personalized design (has `designId`)
 * or a bulk order with a single shared design (`isBulk`).
 * Stock items from "Mūsu kolekcija" are NOT eligible.
 */
export const isVolumeDiscountEligible = (
  item: Pick<CartItem, "designId" | "isBulk">
): boolean => Boolean(item.designId || item.isBulk);

/**
 * Total quantity of ALL eligible (personalized / bulk) items in the cart.
 * The discount tier is based on this combined quantity, not on a single line —
 * a customer ordering 19 different designs × 2 pcs still gets the 37-pcs tier.
 */
export const getEligibleQuantity = (
  items: Pick<CartItem, "designId" | "isBulk" | "quantity">[]
): number =>
  items.reduce((sum, i) => (isVolumeDiscountEligible(i) ? sum + i.quantity : sum), 0);

export interface LineDiscount {
  eligible: boolean;
  percent: number;
  originalUnitPrice: number;
  discountedUnitPrice: number;
  originalLineTotal: number;
  discountedLineTotal: number;
  savings: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * @param tierQuantity Combined eligible quantity used to pick the tier.
 *   Defaults to the line's own quantity for standalone previews.
 */
export const computeLineDiscount = (item: CartItem, tierQuantity?: number): LineDiscount => {
  const eligible = isVolumeDiscountEligible(item);
  const percent = eligible ? getDiscountPercent(tierQuantity ?? item.quantity) : 0;
  const originalUnitPrice = item.price;
  const discountedUnitPrice = percent > 0
    ? round2(originalUnitPrice * (1 - percent / 100))
    : originalUnitPrice;
  const originalLineTotal = round2(originalUnitPrice * item.quantity);
  const discountedLineTotal = round2(discountedUnitPrice * item.quantity);
  return {
    eligible,
    percent,
    originalUnitPrice,
    discountedUnitPrice,
    originalLineTotal,
    discountedLineTotal,
    savings: round2(originalLineTotal - discountedLineTotal),
  };
};
