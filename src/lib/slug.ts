// Slug utilities for product/category URLs.
// Produces lowercase, hyphen-separated slugs with Latvian diacritics
// transliterated to ASCII (ā→a, č→c, ē→e, ģ→g, ī→i, ķ→k, ļ→l, ņ→n, š→s, ū→u, ž→z).

const DIACRITIC_MAP: Record<string, string> = {
  ā: "a", č: "c", ē: "e", ģ: "g", ī: "i", ķ: "k", ļ: "l",
  ņ: "n", š: "s", ū: "u", ž: "z",
  Ā: "a", Č: "c", Ē: "e", Ģ: "g", Ī: "i", Ķ: "k", Ļ: "l",
  Ņ: "n", Š: "s", Ū: "u", Ž: "z",
};

export function slugify(input: string): string {
  if (!input) return "";
  const transliterated = input
    .split("")
    .map((ch) => DIACRITIC_MAP[ch] ?? ch)
    .join("")
    // strip remaining combining marks (covers other accented chars)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return transliterated
    .toLowerCase()
    .replace(/["'`'']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Legacy product slug → current slug. Used for 301-style redirects
 * from old English URLs that Google still has indexed.
 * Keys are old slugs; values are the renamed Latvian slugs.
 * Keep this file in sync with the products.slug column.
 */
export const LEGACY_PRODUCT_SLUG_MAP: Record<string, string> = {
  "baby-bodysuits": "bernu-bodijs",
  "color-changing-mug-magic": "magiska-kruze-300ml",
  "cotton-bag": "kokvilnas-soma",
  "duo-two-tone-mug": "divkrasu-kruze-300ml",
  "fan-shirts": "t-krekls-fanu",
  "hoodie-with-embroidery-latvia": "dzemperis-ar-uzsuvi-latvija",
  "kids-fan-shirt": "bernu-t-krekls-fanu",
  "kids-hoodie-embroidery-latvia": "bernu-dzemperis-ar-uzsuvi-latvija",
  "kids-hoodie-latvija": "bernu-dzemperis-ar-izsuvumu-latvija",
  "large-mug-450ml": "liela-kruze-450ml",
  "latvia-hoodie-three-stars": "dzemperis-tris-zvaigznes",
  "latvia-hoodie-with-embroidery": "dzemperis-ar-izsuvumu-latvija",
  "latvia-shirt-three-stars": "t-krekls-tris-zvaigznes",
  "latvia-shirt-with-embroidery": "t-krekls-ar-izsuvumu-latvija",
  "latvian-hat-embroidery-latvia": "cepure-latvija",
  "latvian-socks": "zekes-latvija",
  "mug-gold-silver-rim": "kruze-ar-zelta-sudraba-osi-300ml",
  "oak-leaf-bag": "soma-ozollapas",
  "oak-leaf-shirt": "t-krekls-ozollapas",
  "organic-cotton-t-shirt": "stanley-stella-organiskas-kokvilnas-t-krekls",
  "sweatshirt-without-hood": "dzemperis-bez-kapuces",
  "t-shirt-kids": "bernu-t-krekls",
  "unisex-dry-handfeel-heavyweight": "stanley-stella-bieza-auduma-t-krekls",
  "unisex-hoodie": "dzemperis-ar-kapuci",
  "white-mug-300ml": "balta-kruze-300ml",
};

export function resolveProductSlug(slug: string | undefined): string {
  if (!slug) return "";
  return LEGACY_PRODUCT_SLUG_MAP[slug] ?? slug;
}