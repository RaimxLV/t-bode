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

export const computeLineDiscount = (item: CartItem): LineDiscount => {
  const eligible = isVolumeDiscountEligible(item);
  const percent = eligible ? getDiscountPercent(item.quantity) : 0;
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
