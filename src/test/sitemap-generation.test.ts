import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const generator = resolve("scripts/generate-sitemap.ts");

function runFixture(fail: boolean) {
  const cwd = mkdtempSync(join(tmpdir(), "sitemap-test-"));
  mkdirSync(join(cwd, "public"));
  writeFileSync(join(cwd, "public/sitemap.xml"), "existing-sitemap");
  const preload = join(cwd, "mock.ts");
  writeFileSync(preload, `
    process.env.VITE_SUPABASE_URL = "https://fixture.invalid";
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "public-fixture";
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      if (${fail}) return new Response("unavailable", {status: 503});
      const offset = Number(url.searchParams.get("offset"));
      let rows = [];
      if (url.pathname.endsWith("products")) {
        rows = Array.from({length: 1001}, (_, i) => ({slug: "product-"+i, updated_at: "2026-10-20T00:00:00Z"})).slice(offset, offset+1000);
      } else if (url.pathname.endsWith("content_categories")) rows = [{slug: "kopšana&idejas"}];
      else rows = [{slug: "article", updated_at: "2026-10-20T00:00:00Z"}];
      return new Response(JSON.stringify(rows));
    };
  `);
  let failed = false;
  try { execFileSync("bun", ["--preload", preload, generator], { cwd, stdio: "pipe" }); }
  catch { failed = true; }
  const xml = readFileSync(join(cwd, "public/sitemap.xml"), "utf8");
  rmSync(cwd, { recursive: true, force: true });
  return { failed, xml };
}

describe("Existing sitemap generator", () => {
  it("includes product rows beyond the first 1000 and active content categories", () => {
    const { failed, xml } = runFixture(false);
    expect(failed).toBe(false);
    expect(xml).toContain("https://t-bode.lv/produkti/product-1000");
    expect(xml).toContain("https://t-bode.lv/idejas/kategorija/kopšana&amp;idejas");
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("/checkout");
  });
  it("preserves the existing sitemap when a public data read fails", () => {
    const { failed, xml } = runFixture(true);
    expect(failed).toBe(true);
    expect(xml).toBe("existing-sitemap");
  });
});