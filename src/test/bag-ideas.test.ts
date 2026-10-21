import { expect, it, vi } from "vitest";
import { bagIdeas, copyBagIdea, visibleBagIdeas, matchingBagIdeas, originalBagIdeas } from "@/components/bags/bagIdeas";
import { bagAuthoredIdeas } from "@/components/bags/bagAuthoredIdeas";

it("preserves twenty original IDs and appends eighty authored ideas to total 100", () => {
  expect(bagIdeas).toHaveLength(100);
  expect(bagIdeas.slice(0, 20)).toEqual(originalBagIdeas);
  expect(bagIdeas.slice(20).map(({ id, category, slogan }) => ({ id, category, slogan }))).toEqual(bagAuthoredIdeas);
  expect(bagIdeas.map((idea) => idea.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
});
it("starts with eight curated mixed ideas including Christmas and increments by sixteen", () => {
  expect(visibleBagIdeas("Visi").map((idea) => idea.id)).toEqual([1, 21, 6, 31, 11, 41, 17, 51]);
  expect(visibleBagIdeas("Visi", 24)).toHaveLength(24);
  expect(visibleBagIdeas("Visi", 100)).toHaveLength(100);
});
it.each([["Ziemassvētki", 30], ["Kaķi", 20], ["Kafija", 15], ["Ikdiena", 21], ["Pastaigas", 14]] as const)("allows all %s ideas beyond the initial eight (%i total)", (category, count) => {
  const ideas = matchingBagIdeas(category);
  expect(ideas).toHaveLength(count);
  expect(ideas.every((idea) => idea.category === category)).toBe(true);
  expect(visibleBagIdeas(category)).toHaveLength(8);
  expect(visibleBagIdeas(category, 24)).toHaveLength(Math.min(24, count));
  expect(visibleBagIdeas(category, 40)).toHaveLength(count);
});
it("copies the selected slogan only after clipboard confirms the write", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  expect(await copyBagIdea(bagIdeas[99].slogan, { writeText })).toBe("success");
  expect(writeText).toHaveBeenCalledWith(bagIdeas[99].slogan);
});
it("reports denied and missing clipboard access honestly", async () => {
  expect(await copyBagIdea("test", { writeText: vi.fn().mockRejectedValue(new Error("denied")) })).toBe("error");
  expect(await copyBagIdea("test", undefined)).toBe("error");
});