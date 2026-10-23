export interface ManualPaymentOrder {
  status: string;
  manually_paid_at?: string | null;
  montonio_payment_status?: string | null;
}

export const canMarkOrderManuallyPaid = (order: ManualPaymentOrder) =>
  !order.manually_paid_at && !["PAID", "FINALIZED"].includes((order.montonio_payment_status ?? "").toUpperCase());

export const statusAfterManualPayment = (status: string) =>
  ["pending", "cancelled"].includes(status) ? "processing" : status;