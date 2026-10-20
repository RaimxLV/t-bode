import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const app = readFileSync("src/App.tsx", "utf8");
const hero = readFileSync("src/components/HeroSection.tsx", "utf8");
describe("SEO closeout routing", () => {
  it("store aliases point to the single /veikali page", () => {
    for (const p of ["/stores", "/store", "/kontakti", "/contact", "/locations"])
      expect(app).toContain(`path="${p}" element={<LegacyRedirect to="/veikali" />}`);
  });
  it("hero personalization CTA is a crawlable link to /design", () => {
    expect(hero).toContain('to="/design"');
  });
});
