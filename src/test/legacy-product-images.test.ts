import { expect, it } from "vitest";
import { resolveLegacyProductImage } from "@/lib/legacyProductImages";

it.each([
  "2026/01/FANU-krekls-Bordo-1890-eur-1.png",
  "2026/02/LV-krekls-ar-izsuvi-_bordo_1990-eur-1.png",
  "2026/02/LV-krekls-ar-izsuvi-_desert-dust_-1990-eur-1.png",
  "2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur.png",
])("maps only storage-confirmed exact variant %s", (path) => {
  expect(resolveLegacyProductImage(`https://mml.s-host.net/t-bode/wp-content/uploads/${path}`)).toBe(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/wp/${path}`);
  expect(resolveLegacyProductImage(`https://www.mml.s-host.net/t-bode/wp-content/uploads/${path}`)).toBe(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/wp/${path}`);
});

it("never guesses another photo or host", () => {
  const unknown = "https://mml.s-host.net/t-bode/wp-content/uploads/2026/02/unknown.png";
  expect(resolveLegacyProductImage(unknown)).toBe(unknown);
});