import { describe, expect, it } from "vitest";
import { lastMonths, quotaAllowed, quotaRemaining } from "./ai-quota";

const base = { quota: 10, used: 0, isBlocked: false, isAdmin: false };
describe("AI quota", () => {
  it("free user with 10/month is allowed at 9 used and stopped at 10", () => {
    expect(quotaAllowed({ ...base, used: 9 })).toBe(true);
    expect(quotaAllowed({ ...base, used: 10 })).toBe(false);
    expect(quotaRemaining({ ...base, used: 7 })).toBe(3);
  });
  it("blocked user gets nothing even with remaining quota", () => {
    expect(quotaAllowed({ ...base, isBlocked: true })).toBe(false);
    expect(quotaRemaining({ ...base, isBlocked: true })).toBe(0);
  });
  it("custom quota 0 throttles", () => { expect(quotaAllowed({ ...base, quota: 0 })).toBe(false); });
  it("null quota (supporter) is unlimited", () => {
    expect(quotaAllowed({ ...base, quota: null, used: 999 })).toBe(true);
    expect(quotaRemaining({ ...base, quota: null })).toBeNull();
  });
  it("admin is always unlimited", () => { expect(quotaAllowed({ ...base, used: 50, isAdmin: true })).toBe(true); });
  it("lastMonths spans year boundary", () => { expect(lastMonths("2026-02-15", 3)).toEqual(["2025-12", "2026-01", "2026-02"]); });
});
