/** Ready-made catalogue rules: "Jaunums" window, fresh ordering, publish validation, theme filter. */

/** How long a newly published ready-made product counts as "Jaunums". */
export const NEW_PRODUCT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

type Publishable = { published_at?: string | null };

/** True while the product's FIRST publication is inside the "Jaunums" window. */
export function isFreshlyPublished(p: Publishable, now: Date = new Date(), days = NEW_PRODUCT_DAYS): boolean {
  if (!p.published_at) return false;
  const t = new Date(p.published_at).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t >= 0 && now.getTime() - t < days * DAY_MS;
}

/**
 * Freshly published products go first (newest first publication on top);
 * everything else keeps its incoming (manual) order.
 */
export function sortReadyMadeProducts<T extends Publishable>(products: T[], now: Date = new Date()): T[] {
  const fresh = products.filter((p) => isFreshlyPublished(p, now));
  const rest = products.filter((p) => !isFreshlyPublished(p, now));
  fresh.sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime());
  return [...fresh, ...rest];
}

export interface PublishCandidate {
  name_lv?: string;
  name?: string;
  slug: string;
  price: number;
  category: string;
  image_url?: string;
  mockup_image_url?: string;
  color_variants: { name: string; images: string[] }[];
}

/** Returns Latvian messages for every missing required field; empty = ready to publish. */
export function validateForPublish(p: PublishCandidate): string[] {
  const errors: string[] = [];
  if (!(p.name_lv || p.name || "").trim()) errors.push("Nosaukums (LV)");
  if (!p.slug.trim()) errors.push("Saite (slug)");
  if (!(Number(p.price) > 0)) errors.push("Cena lielāka par 0");
  if (!p.category) errors.push("Kategorija");
  const hasImage = !!p.image_url || !!p.mockup_image_url || p.color_variants.some((v) => v.images.length > 0);
  if (!hasImage) errors.push("Vismaz viena bilde");
  if (p.color_variants.some((v) => !v.name.trim())) errors.push("Katrai krāsai nosaukums");
  return errors;
}

type Themed = { product_theme_assignments?: { theme_id: string }[] | null };

/** Filters products by theme id; "all" returns everything. */
export function filterByTheme<T extends Themed>(products: T[], themeId: string | "all"): T[] {
  if (themeId === "all") return products;
  return products.filter((p) => (p.product_theme_assignments ?? []).some((a) => a.theme_id === themeId));
}

/** Pure move helper for reordering image lists. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
