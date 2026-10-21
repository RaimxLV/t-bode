import { expect, it } from "vitest";
import { productInitialColor } from "@/lib/productInitialColor";

it("carries the exact real bag variant identity including spaces", () => {
  expect(productInitialColor("?color=Dark%20blue", [{ name: "Natural" }, { name: "Dark blue" }])).toBe("Dark blue");
});
it("ignores invalid initial colors rather than inventing variants", () => {
  expect(productInitialColor("?color=Aloe", [{ name: "Natural" }, { name: "White" }])).toBe("Natural");
});
it("has no fictional default when variants are absent", () => {
  expect(productInitialColor("?color=Natural", [])).toBe("");
});