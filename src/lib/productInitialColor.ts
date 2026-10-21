/** URL color is only an initial suggestion, validated against actual variants. */
export function productInitialColor(search: string, variants: readonly { name: string }[]): string {
  const requested = new URLSearchParams(search).get("color");
  return variants.find((variant) => variant.name === requested)?.name ?? variants[0]?.name ?? "";
}