/** Exact objects confirmed in public storage; never infer a different variant. */
const confirmedPaths = new Set([
  "2026/01/FANU-krekls-Bordo-1890-eur-1.png",
  "2026/02/LV-krekls-ar-izsuvi-_bordo_1990-eur-1.png",
  "2026/02/LV-krekls-ar-izsuvi-_desert-dust_-1990-eur-1.png",
  "2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur.png",
]);

export function resolveLegacyProductImage(src: string): string {
  try {
    const url = new URL(src);
    const prefix = "/t-bode/wp-content/uploads/";
    if (!["mml.s-host.net", "www.mml.s-host.net"].includes(url.hostname) || !url.pathname.startsWith(prefix)) return src;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!confirmedPaths.has(path)) return src;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/wp/${path}`;
  } catch {
    return src;
  }
}