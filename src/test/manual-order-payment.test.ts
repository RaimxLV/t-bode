import { expect, it } from "vitest";
import { canMarkOrderManuallyPaid, statusAfterManualPayment } from "@/lib/manualOrderPayment";

it("allows manual confirmation for Montonio orders without a reported payment", () => {
  expect(canMarkOrderManuallyPaid({ status: "pending", montonio_payment_status: null })).toBe(true);
});
it("restores a cancelled paid order to processing", () => {
  expect(statusAfterManualPayment("cancelled")).toBe("processing");
});
it("moves pending paid orders to processing", () => {
  expect(statusAfterManualPayment("pending")).toBe("processing");
});
it("does not rewind shipped or delivered orders", () => {
  expect(statusAfterManualPayment("shipped")).toBe("shipped");
  expect(statusAfterManualPayment("delivered")).toBe("delivered");
});
it("does not offer confirmation again for received or manually confirmed payments", () => {
  expect(canMarkOrderManuallyPaid({ status: "processing", manually_paid_at: "2026-10-23T08:16:00Z" })).toBe(false);
  for (const status of ["PAID", "FINALIZED"]) {
    expect(canMarkOrderManuallyPaid({ status: "processing", montonio_payment_status: status })).toBe(false);
  }
});