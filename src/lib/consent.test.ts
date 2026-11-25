import { describe, expect, it } from "vitest";
import { needsConsent } from "./consent";

describe("needsConsent", () => {
  it("prompts a user with no consent", () => expect(needsConsent([], 1)).toBe(true));
  it("does not prompt when current version is accepted", () => expect(needsConsent([1], 1)).toBe(false));
  it("prompts again when the version is bumped", () => expect(needsConsent([1], 2)).toBe(true));
  it("uses the highest accepted version", () => expect(needsConsent([2, 1], 2)).toBe(false));
});
