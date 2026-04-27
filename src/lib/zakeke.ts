/**
 * Shared helpers to keep variant codes identical between
 * the frontend and the `zakeke-products` edge function.
 */

export function sanitizeZakekeCodePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getZakekeProductCode(product: {
  zakeke_model_code?: string | null;
  id?: string | null;
  slug?: string | null;
}): string {
  return (
    product.zakeke_model_code ||
    product.id ||
    product.slug ||
    ""
  );
}

export function buildZakekeVariantCodes(
  productCode: string,
  selected: { color?: string; size?: string }
): { color?: string; size?: string } {
  const out: { color?: string; size?: string } = {};
  if (productCode && selected.color) {
    out.color = `${productCode}-color-${sanitizeZakekeCodePart(selected.color)}`;
  }
  if (productCode && selected.size) {
    out.size = `${productCode}-size-${sanitizeZakekeCodePart(selected.size)}`;
  }
  return out;
}