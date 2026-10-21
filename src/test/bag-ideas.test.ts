import { expect, it, vi } from "vitest";
import { bagIdeas, copyBagIdea, visibleBagIdeas } from "@/components/bags/bagIdeas";

it("initially shows eight of twenty unique ideas, revealing all twenty on request", () => {
  expect(bagIdeas).toHaveLength(20);
  expect(new Set(bagIdeas.map((idea) => idea.id)).size).toBe(20);
  expect(visibleBagIdeas("Visi", false)).toHaveLength(8);
  expect(visibleBagIdeas("Visi", true)).toHaveLength(20);
});
it.each([["Kaķi", 5], ["Kafija", 5], ["Ikdiena", 6], ["Pastaigas", 4]] as const)("filters %s into its own %i ideas", (category, count) => {
  const ideas = visibleBagIdeas(category, false);
  expect(ideas).toHaveLength(count);
  expect(ideas.every((idea) => idea.category === category)).toBe(true);
});
it("copies the selected slogan only after clipboard confirms the write", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  expect(await copyBagIdea(bagIdeas[9].slogan, { writeText })).toBe("success");
  expect(writeText).toHaveBeenCalledWith(bagIdeas[9].slogan);
});
it("reports denied and missing clipboard access honestly", async () => {
  expect(await copyBagIdea("test", { writeText: vi.fn().mockRejectedValue(new Error("denied")) })).toBe("error");
  expect(await copyBagIdea("test", undefined)).toBe("error");
});