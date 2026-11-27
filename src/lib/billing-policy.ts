export const BILLING_APP = "rappgym";
export const SUPPORTER_AI_QUOTA = 30;
/** RappGym Supporter product in the RappSol Stripe account (live). Amounts in euro cents. */
export const SUPPORTER_PRODUCT_ID = "prod_Vht9Z4sl29i9dX";
export const SUPPORTER_PLANS = {
  month: { priceId: "price_1UgTNACtWSqkNdvTpukBlx28", amount: 400, interval: "month" },
  year: { priceId: "price_1UgTs6CtWSqkNdvTrbWivx1B", amount: 4000, interval: "year" },
} as const;
export type SupporterPlan = keyof typeof SUPPORTER_PLANS;
export const SUPPORTER_CURRENCY = "eur";
export function isSupporterPrice(priceId: string) {
  return Object.values(SUPPORTER_PLANS).some((p) => p.priceId === priceId);
}
export function subscriptionActive(status: string, periodEnd: number, now: number) {
  return status === "active" && periodEnd > now;
}
/** Checkout is open when the Stripe key exists, unless RAPPGYM_BILLING_ENABLED is explicitly "false". */
export function billingConfigured(enabled: string | undefined, key: string | undefined) {
  return enabled !== "false" && !!key;
}
