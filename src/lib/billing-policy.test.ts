import { describe, it, expect } from "vitest";
import {
  BILLING_APP,
  SUPPORTER_AI_QUOTA,
  SUPPORTER_PLANS,
  subscriptionActive,
  billingConfigured,
  isSupporterPrice,
} from "./billing-policy";
describe("RappGym billing rules", () => {
  it("keeps RappGym separate from tool donations", () => expect(BILLING_APP).toBe("rappgym"));
  it("supporter AI is finite", () => expect(SUPPORTER_AI_QUOTA).toBe(30));
  it("costs €4/month or €40/year", () => {
    expect(SUPPORTER_PLANS.month.amount).toBe(400);
    expect(SUPPORTER_PLANS.year.amount).toBe(4000);
  });
  it("accepts only RappGym prices", () => {
    expect(isSupporterPrice(SUPPORTER_PLANS.year.priceId)).toBe(true);
    expect(isSupporterPrice("price_other_tool")).toBe(false);
  });
  it("does not grant access for unpaid or expired subscriptions", () => {
    expect(subscriptionActive("active", 200, 100)).toBe(true);
    expect(subscriptionActive("past_due", 200, 100)).toBe(false);
    expect(subscriptionActive("active", 100, 100)).toBe(false);
  });
  it("needs a key and can be switched off", () => {
    expect(billingConfigured(undefined, undefined)).toBe(false);
    expect(billingConfigured("false", "key")).toBe(false);
    expect(billingConfigured(undefined, "key")).toBe(true);
  });
});
