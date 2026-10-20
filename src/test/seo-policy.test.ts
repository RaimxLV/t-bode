import { describe, expect, it } from "vitest";
import { buildCanonical, shouldNoindex } from "../lib/seoPolicy";

describe("Public SEO policy", () => {
  it("normalizes www and preview origins to the public apex", () => {
    expect(buildCanonical("https://www.t-bode.lv/design/")).toBe("https://t-bode.lv/design");
    expect(buildCanonical("https://t-bode.lovable.app/collection")).toBe("https://t-bode.lv/collection");
  });
  it("strips tracking, fragments, filters and draft state from explicit canonicals", () => {
    expect(buildCanonical("/produkti/bernu-t-krekls?preview=1&utm_source=test#design")).toBe("https://t-bode.lv/produkti/bernu-t-krekls");
    expect(buildCanonical("/design?category=bags")).toBe("https://t-bode.lv/design");
    expect(buildCanonical("/")).toBe("https://t-bode.lv/");
  });
  for (const route of ["/cart", "/checkout", "/admin", "/auth", "/profile", "/payment-success", "/reset-password", "/install"]) {
    it(`excludes technical route ${route}`, () => {
      expect(shouldNoindex(route, "")).toBe(true);
    });
  }
  it("excludes draft previews without hiding public products or the design entry", () => {
    expect(shouldNoindex("/produkti/bernu-t-krekls", "?preview=1")).toBe(true);
    expect(shouldNoindex("/produkti/bernu-t-krekls", "")).toBe(false);
    expect(shouldNoindex("/design", "?category=bags")).toBe(false);
    expect(shouldNoindex("/", "")).toBe(false);
  });
});