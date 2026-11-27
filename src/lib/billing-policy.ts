export const BILLING_APP = "rappgym";
export const SUPPORTER_AI_QUOTA = 30;
export function subscriptionActive(status: string, periodEnd: number, now: number) {
  return status === "active" && periodEnd > now;
}
export function billingConfigured(
  enabled: string | undefined,
  key: string | undefined,
  price: string | undefined,
  product: string | undefined,
  webhook: string | undefined,
) {
  return (
    enabled === "true" &&
    !!key &&
    !!price?.startsWith("price_") &&
    !!product?.startsWith("prod_") &&
    !!webhook
  );
}
