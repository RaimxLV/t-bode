import { describe, expect, it } from "vitest";
import { publicAnalyticsPath, safeAnalyticsReferrer } from "@/lib/analyticsPolicy";

describe("public analytics privacy", () => {
  it("keeps the public design entry but never its query state", () => {
    expect(publicAnalyticsPath("/design", "?email=private@example.test&designId=abc")).toBe("/design");
  });
  it.each(["/checkout", "/admin/orders", "/auth", "/profile", "/payment-success", "/reset-password"])("excludes private route %s", (path) => {
    expect(publicAnalyticsPath(path)).toBeNull();
  });
  it("excludes draft previews", () => {
    expect(publicAnalyticsPath("/produkti/example", "?preview=1")).toBeNull();
  });
  it("excludes unknown routes", () => {
    expect(publicAnalyticsPath("/unknown-private-token")).toBeNull();
  });
  it("removes all referrer path query and hash state", () => {
    expect(safeAnalyticsReferrer("https://example.test/account?email=private#token")).toBe("https://example.test");
  });
});