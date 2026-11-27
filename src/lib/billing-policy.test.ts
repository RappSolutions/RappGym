import { describe, it, expect } from "vitest";
import {
  BILLING_APP,
  SUPPORTER_AI_QUOTA,
  subscriptionActive,
  billingConfigured,
} from "./billing-policy";
describe("RappGym billing rules", () => {
  it("keeps RappGym separate from tool donations", () => expect(BILLING_APP).toBe("rappgym"));
  it("supporter AI is finite", () => expect(SUPPORTER_AI_QUOTA).toBe(30));
  it("does not grant access for unpaid or expired subscriptions", () => {
    expect(subscriptionActive("active", 200, 100)).toBe(true);
    expect(subscriptionActive("past_due", 200, 100)).toBe(false);
    expect(subscriptionActive("active", 100, 100)).toBe(false);
  });
  it("cannot charge until explicitly enabled with product, price and webhook", () => {
    expect(billingConfigured(undefined, "key", "price_1", "prod_1", "secret")).toBe(false);
    expect(billingConfigured("true", "key", undefined, "prod_1", "secret")).toBe(false);
    expect(billingConfigured("true", "key", "price_1", "prod_1", "secret")).toBe(true);
  });
});
