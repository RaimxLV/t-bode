import { bagIdeas, type BagIdea } from "./bagIdeas";
import { bagArtworkRegistry, artworkMaxPhysicalSize, type BagArtworkId } from "./bagArtworkRegistry";

export const BAG_MODEL_CODE = "11b8dafd-4ec6-4d99-81f9-483acee81b65";
export const BAG_PRODUCT_SLUG = "kokvilnas-soma";
export type NormalizedBox = { x: number; y: number; width: number; height: number };
export type BagPlacement = "text-above" | "text-below" | "split-caption";
export type BagTemplate = {
  version: 1;
  ideaId: number;
  productSlug: typeof BAG_PRODUCT_SLUG;
  modelCode: typeof BAG_MODEL_CODE;
  status: "unregistered";
  templateCode: null;
  loadTemplateId: null;
  printBackground: "transparent";
  placement: BagPlacement;
  palette: "cream" | "ink" | "cobalt" | "evergreen";
  layers: [
    { kind: "image"; artworkId: BagArtworkId; box: NormalizedBox; nativeDimensions: { width: number; height: number } | null; maxPhysicalSize: ReturnType<typeof artworkMaxPhysicalSize> },
    { kind: "text"; text: string; box: NormalizedBox; fontFamily: "Georgia"; fontSizeNormalized: number; align: "center"; fontAccountVerified: false }
  ];
};

function artworkIdFor(idea: BagIdea): BagArtworkId {
  if (idea.category === "Ziemassvētki") {
    if (idea.id <= 30) return "christmas-cat";
    if (idea.id <= 40) return "christmas-gifts";
    return idea.id <= 47 ? "christmas-gingerbread" : "christmas-cocoa";
  }
  return ({ Kaķi: "cat", Kafija: "coffee", Ikdiena: "everyday", Pastaigas: "nature" } as const)[idea.category];
}
const placements: BagPlacement[] = ["text-above", "text-below", "split-caption"];
const palettes: BagTemplate["palette"][] = ["cream", "ink", "cobalt", "evergreen"];
const boxes: Record<BagPlacement, { image: NormalizedBox; text: NormalizedBox }> = {
  "text-above": { text: { x: .09, y: .07, width: .82, height: .26 }, image: { x: .12, y: .38, width: .76, height: .55 } },
  "text-below": { image: { x: .12, y: .07, width: .76, height: .55 }, text: { x: .09, y: .67, width: .82, height: .26 } },
  "split-caption": { image: { x: .07, y: .12, width: .47, height: .76 }, text: { x: .59, y: .12, width: .34, height: .76 } },
};

/** Local editorial plan, not a Zakeke payload or print export. No invented asset dimensions. */
export const bagTemplateManifest: { version: 1; templates: BagTemplate[] } = {
  version: 1,
  templates: bagIdeas.map((idea) => {
    const placement = placements[(idea.id - 1) % placements.length];
    const artworkId = artworkIdFor(idea);
    const artwork = bagArtworkRegistry[artworkId];
    return {
      version: 1, ideaId: idea.id, productSlug: BAG_PRODUCT_SLUG, modelCode: BAG_MODEL_CODE,
      status: "unregistered", templateCode: null, loadTemplateId: null, printBackground: "transparent",
      placement, palette: palettes[(idea.id - 1) % palettes.length],
      layers: [
        { kind: "image", artworkId, box: boxes[placement].image, nativeDimensions: artwork ? { width: artwork.nativeWidth, height: artwork.nativeHeight } : null, maxPhysicalSize: artwork ? artworkMaxPhysicalSize(artwork) : null },
        { kind: "text", text: idea.slogan, box: boxes[placement].text, fontFamily: "Georgia", fontSizeNormalized: .075, align: "center", fontAccountVerified: false },
      ],
    };
  }),
};