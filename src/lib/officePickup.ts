// Centralized constant for the office pickup address.
// Stored in `orders.omniva_pickup_point` with the `BIROJS:` prefix so the
// admin panel and emails can distinguish office pickup from real Omniva
// parcel machines.
export const OFFICE_PICKUP_ADDRESS = "Braslas iela 29, Ieeja D, Rīga";
export const OFFICE_PICKUP_PREFIX = "BIROJS";
export const OFFICE_PICKUP_VALUE = `${OFFICE_PICKUP_PREFIX}: ${OFFICE_PICKUP_ADDRESS}`;

export const isOfficePickup = (value?: string | null): boolean =>
  !!value && value.toUpperCase().startsWith(OFFICE_PICKUP_PREFIX);

export const stripOfficePrefix = (value: string): string =>
  value.replace(/^BIROJS:?\s*/i, "");