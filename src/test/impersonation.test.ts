import { describe, expect, it } from "vitest";
import { canInspectUser, userViewCanWrite } from "@/lib/impersonation-policy";

describe("admin read-only user view", () => {
  it("allows admins to inspect ordinary users only", () => {
    expect(canInspectUser("admin", true, "user", false)).toBe(true);
    expect(canInspectUser("user", false, "other", false)).toBe(false);
    expect(canInspectUser("admin", true, "other-admin", true)).toBe(false);
    expect(canInspectUser("admin", true, "admin", true)).toBe(false);
  });
  it("does not authorize any target-user writes, even for an admin", () => {
    expect(userViewCanWrite(true)).toBe(false);
    expect(userViewCanWrite(false)).toBe(true);
  });
});