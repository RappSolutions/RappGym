import { describe, it, expect } from "vitest";
import { deleteAccountSchema, membershipSchema, membershipActive } from "./account-policy";
describe("account rules", () => {
  it("requires exact DELETE confirmation", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "yes" }).success).toBe(false);
  });
  it("membership includes start and end dates only", () => {
    expect(membershipActive("2026-11-01", "2026-11-30", "2026-11-30")).toBe(true);
    expect(membershipActive("2026-11-01", "2026-11-30", "2026-12-01")).toBe(false);
    expect(membershipActive("2026-11-01", "2026-11-30", "2026-10-31")).toBe(false);
  });
  it("payment identity uses user UUID, not payment email", () => {
    expect(
      membershipSchema.safeParse({
        userId: "123e4567-e89b-42d3-a456-426614174000",
        startsOn: "2026-11-01",
        endsOn: "2026-11-30",
        stripeReference: "pi_123",
      }).success,
    ).toBe(true);
    expect(
      membershipSchema.safeParse({
        userId: "person@example.com",
        startsOn: "2026-11-01",
        endsOn: "2026-11-30",
        stripeReference: "pi_123",
      }).success,
    ).toBe(false);
  });
});
