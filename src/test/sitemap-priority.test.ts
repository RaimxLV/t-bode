import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sitemap = readFileSync("public/sitemap.xml", "utf8");
const sources = [
  "scripts/generate-sitemap.ts",
  "supabase/functions/generate-sitemap/index.ts",
  "supabase/functions/sitemap/index.ts",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

describe("Online personalization sitemap priorities", () => {
  for (const [path, priority] of [["/", "1.0"], ["/design", "1.0"], ["/collection", "0.5"], ["/veikali", "0.3"], ["/auduma-maisinu-apdruka", "0.8"]]) {
    it(`${path} has priority ${priority} in the served sitemap and every existing generator`, () => {
      const entries = sitemap.match(/<url>[\s\S]*?<\/url>/g) ?? [];
      const entry = entries.find((value) => value.includes(`<loc>https://t-bode.lv${path}</loc>`));
      expect(entry).toBeDefined();
      expect(entry).toContain(`<priority>${priority}</priority>`);
      for (const { source } of sources) {
        const route = source.split("\n").find((line) => line.includes(`path: "${path}"`));
        expect(route).toContain(`priority: "${priority}"`);
      }
    });
  }
});