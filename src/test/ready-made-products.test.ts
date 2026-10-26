import { describe, expect, it } from "vitest";
import { filterByTheme, isFreshlyPublished, moveItem, NEW_PRODUCT_DAYS, sortReadyMadeProducts, validateForPublish } from "@/lib/readyMadeProducts";

const now = new Date("2026-10-26T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

describe("Jaunums window", () => {
  it("lasts 30 days from the first publication", () => {
    expect(NEW_PRODUCT_DAYS).toBe(30);
    expect(isFreshlyPublished({ published_at: daysAgo(29) }, now)).toBe(true);
    expect(isFreshlyPublished({ published_at: daysAgo(31) }, now)).toBe(false);
  });
  it("never applies to products that were never published", () => {
    expect(isFreshlyPublished({ published_at: null }, now)).toBe(false);
  });
});

describe("ready-made ordering", () => {
  it("puts freshly published products first, newest first, and keeps manual order for the rest", () => {
    const list = [
      { id: "manual-1", published_at: null },
      { id: "old", published_at: daysAgo(90) },
      { id: "fresh-older", published_at: daysAgo(5) },
      { id: "manual-2", published_at: null },
      { id: "fresh-newest", published_at: daysAgo(1) },
    ];
    expect(sortReadyMadeProducts(list, now).map((p) => p.id)).toEqual(["fresh-newest", "fresh-older", "manual-1", "old", "manual-2"]);
  });
});

describe("publish validation", () => {
  const ok = { name_lv: "Krekls", slug: "krekls", price: 19, category: "t-shirts", image_url: "a.png", color_variants: [] };
  it("accepts a complete product", () => expect(validateForPublish(ok)).toEqual([]));
  it("requires a price above zero and an image", () => {
    expect(validateForPublish({ ...ok, price: 0, image_url: "" })).toEqual(["Cena lielāka par 0", "Vismaz viena bilde"]);
  });
  it("requires a name for every colour", () => {
    expect(validateForPublish({ ...ok, color_variants: [{ name: " ", images: ["x"] }] })).toEqual(["Katrai krāsai nosaukums"]);
  });
});

describe("theme filter", () => {
  const products = [
    { id: "a", product_theme_assignments: [{ theme_id: "hike" }, { theme_id: "xmas" }] },
    { id: "b", product_theme_assignments: [{ theme_id: "xmas" }] },
    { id: "c", product_theme_assignments: [] },
  ];
  it("matches products in any of their themes", () => {
    expect(filterByTheme(products, "hike").map((p) => p.id)).toEqual(["a"]);
    expect(filterByTheme(products, "xmas").map((p) => p.id)).toEqual(["a", "b"]);
    expect(filterByTheme(products, "all")).toHaveLength(3);
  });
});

describe("image reorder", () => {
  it("moves an image without mutating the original list", () => {
    const src = ["1", "2", "3"];
    expect(moveItem(src, 2, 0)).toEqual(["3", "1", "2"]);
    expect(src).toEqual(["1", "2", "3"]);
    expect(moveItem(src, 0, -1)).toBe(src);
  });
});
