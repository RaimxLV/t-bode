import { bagTemplateManifest, BAG_MODEL_CODE, BAG_PRODUCT_SLUG } from "@/components/bags/bagTemplateManifest";

export type VerifiedBagTemplateMapping = {
  ideaId: number;
  productSlug: string;
  modelCode: string;
  verified: true;
  reviewApproved: true;
} & ({ templateCode: string; loadTemplateId?: never } | { loadTemplateId: string; templateCode?: never });

/** Populate only after account-side registration, product verification and review approval. */
const verifiedBagTemplateMappings: readonly VerifiedBagTemplateMapping[] = [];

export function resolveBagTemplate(ideaId: unknown, productSlug: string, modelCode: string,
  mappings: readonly VerifiedBagTemplateMapping[] = verifiedBagTemplateMappings) {
  if (typeof ideaId !== "number" || !Number.isInteger(ideaId) || productSlug !== BAG_PRODUCT_SLUG || modelCode !== BAG_MODEL_CODE ||
    !bagTemplateManifest.templates.some((entry) => entry.ideaId === ideaId)) return null;
  const mapping = mappings.find((entry) => entry.ideaId === ideaId && entry.productSlug === productSlug &&
    entry.modelCode === modelCode && entry.verified === true && entry.reviewApproved === true);
  if (!mapping) return null;
  if (typeof mapping.templateCode === "string" && mapping.templateCode.trim() && mapping.loadTemplateId === undefined) return { templateCode: mapping.templateCode };
  if (typeof mapping.loadTemplateId === "string" && mapping.loadTemplateId.trim() && mapping.templateCode === undefined) return { loadTemplateId: mapping.loadTemplateId };
  return null;
}

/** Only an explicit gallery choice can carry this state; URLs never contain raw template codes. */
export function bagTemplateNavigation(href: string, ideaId: number) {
  const url = new URL(href, "https://t-bode.lv");
  if (url.origin !== "https://t-bode.lv" || url.pathname !== `/produkti/${BAG_PRODUCT_SLUG}` ||
    !resolveBagTemplate(ideaId, BAG_PRODUCT_SLUG, BAG_MODEL_CODE)) return null;
  return { to: `${url.pathname}${url.search}${url.hash}`, state: { bagTemplateIdeaId: ideaId } };
}

export function initialBagTemplateChoice(ideaId: unknown, productSlug: string, modelCode: string,
  explicitChoice: boolean, alreadyOpened: boolean, mappings?: readonly VerifiedBagTemplateMapping[]) {
  if (!explicitChoice || alreadyOpened) return null;
  return resolveBagTemplate(ideaId, productSlug, modelCode, mappings);
}