import { expect, it } from "vitest";
import { bagTemplateManifest, BAG_MODEL_CODE, BAG_PRODUCT_SLUG } from "@/components/bags/bagTemplateManifest";
import { artworkMaxPhysicalSize, bagArtworkRegistry } from "@/components/bags/bagArtworkRegistry";
import { bagIdeas } from "@/components/bags/bagIdeas";
import { initialBagTemplateChoice, resolveBagTemplate, bagTemplateNavigation, type VerifiedBagTemplateMapping } from "@/lib/bagTemplateBridge";

it("keeps all 100 local templates unregistered and tied to the actual bag model", () => {
  expect(bagTemplateManifest.version).toBe(1);
  expect(bagTemplateManifest.templates).toHaveLength(100);
  for (const [index, entry] of bagTemplateManifest.templates.entries()) {
    expect(entry.modelCode).toBe("11b8dafd-4ec6-4d99-81f9-483acee81b65");
    expect(entry.productSlug).toBe("kokvilnas-soma");
    expect(entry.status).toBe("unregistered");
    expect(entry.templateCode).toBeNull();
    expect(entry.loadTemplateId).toBeNull();
    expect(entry.printBackground).toBe("transparent");
    expect(entry.layers[1].text).toBe(bagIdeas[index].slogan);
    expect(entry.layers[0].nativeDimensions).toBeNull();
    expect(entry.layers[0].maxPhysicalSize).toBeNull();
  }
  expect(Object.keys(bagArtworkRegistry)).toHaveLength(0);
});
it("reserves nonoverlapping normalized painting and text safe areas for all three placements", () => {
  expect(new Set(bagTemplateManifest.templates.map((entry) => entry.placement)).size).toBe(3);
  for (const entry of bagTemplateManifest.templates) {
    const a = entry.layers[0].box, b = entry.layers[1].box;
    for (const box of [a, b]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1);
      expect(box.y + box.height).toBeLessThanOrEqual(1);
    }
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
  }
});
it("computes physical size only from genuine native pixels and an explicit DPI", () => {
  const artwork = { id: "cat", src: "/test-only.png", nativeWidth: 3000, nativeHeight: 4500, hasAlpha: true, nativeResolutionVerified: true } as const;
  expect(artworkMaxPhysicalSize(artwork, 300)).toEqual({ widthMm: 254, heightMm: 381, dpi: 300 });
  expect(artworkMaxPhysicalSize(artwork, 0)).toBeNull();
  expect(artworkMaxPhysicalSize({ ...artwork, nativeWidth: 0 })).toBeNull();
});
it.each([null, undefined, 0, 101, "21", 21.5, NaN])("rejects null or unknown idea mapping %s", (id) => {
  expect(resolveBagTemplate(id, BAG_PRODUCT_SLUG, BAG_MODEL_CODE)).toBeNull();
});
it("never offers preload for an unregistered idea", () => {
  expect(resolveBagTemplate(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE)).toBeNull();
  expect(bagTemplateNavigation("/produkti/kokvilnas-soma?color=Dark%20blue", 21)).toBeNull();
});
// Test-only fixture; never present in the runtime allowlist.
const mapping: VerifiedBagTemplateMapping = { ideaId: 21, productSlug: BAG_PRODUCT_SLUG, modelCode: BAG_MODEL_CODE, verified: true, reviewApproved: true, templateCode: "test-only-fixture" };
it("rejects mismatched products, models and unapproved mappings", () => {
  expect(resolveBagTemplate(21, "krekls", BAG_MODEL_CODE, [mapping])).toBeNull();
  expect(resolveBagTemplate(21, BAG_PRODUCT_SLUG, "another-model", [mapping])).toBeNull();
  expect(resolveBagTemplate(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, [{ ...mapping, productSlug: "krekls" }])).toBeNull();
  expect(resolveBagTemplate(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, [{ ...mapping, verified: false } as unknown as VerifiedBagTemplateMapping])).toBeNull();
});
it("passes official fields only after explicit confirmation and first open", () => {
  expect(initialBagTemplateChoice(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, true, false, [mapping])).toEqual({ templateCode: "test-only-fixture" });
  expect(initialBagTemplateChoice(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, false, false, [mapping])).toBeNull();
  expect(initialBagTemplateChoice(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, true, true, [mapping])).toBeNull();
  const loadMapping: VerifiedBagTemplateMapping = { ideaId: 21, productSlug: BAG_PRODUCT_SLUG, modelCode: BAG_MODEL_CODE, verified: true, reviewApproved: true, loadTemplateId: "test-only-load-fixture" };
  expect(resolveBagTemplate(21, BAG_PRODUCT_SLUG, BAG_MODEL_CODE, [loadMapping])).toEqual({ loadTemplateId: "test-only-load-fixture" });
});