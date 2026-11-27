import { describe, it, expect } from "vitest";
import { deleteAccountSchema, membershipSchema, membershipActive, membershipEndDate } from "./account-policy";
describe("account rules", () => {
  const grant = { userId: "123e4567-e89b-42d3-a456-426614174000", startsOn: "2026-11-27", endsOn: "2026-12-27" };
  it("allows complimentary supporter access without a Stripe reference", () => {
    expect(membershipSchema.parse(grant).stripeReference).toBe("");
    expect(membershipSchema.parse({ ...grant, stripeReference: " " }).stripeReference).toBe("");
  });
  it("keeps optional notes separate from payment references", () => {
    const result = membershipSchema.parse({ ...grant, note: " Gift " });
    expect(result.note).toBe("Gift");
    expect(result.stripeReference).toBe("");
  });
  it("rejects invalid dates and end dates before the start", () => {
    expect(membershipSchema.safeParse({ ...grant, endsOn: "2026-11-26" }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...grant, endsOn: "2027-02-30" }).success).toBe(false);
  });
  it("quick selections use calendar months and clamp month-end dates", () => {
    expect(membershipEndDate("2026-11-27", 1)).toBe("2026-12-27");
    expect(membershipEndDate("2026-11-27", 3)).toBe("2027-02-27");
    expect(membershipEndDate("2026-11-27", 12)).toBe("2027-11-27");
    expect(membershipEndDate("2027-01-31", 1)).toBe("2027-02-28");
  });
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
