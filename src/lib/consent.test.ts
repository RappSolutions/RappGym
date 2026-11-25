import { describe, expect, it } from "vitest";
import { consentPrompt, latestConsent, needsConsent } from "./consent";

describe("needsConsent", () => {
  it("prompts a user with no consent", () => expect(needsConsent([], 1)).toBe(true));
  it("does not prompt when current version is accepted", () => expect(needsConsent([1], 1)).toBe(false));
  it("prompts again when the version is bumped", () => expect(needsConsent([1], 2)).toBe(true));
  it("uses the highest accepted version", () => expect(needsConsent([2, 1], 2)).toBe(false));
});

describe("consentPrompt", () => {
  it("first-time prompt when nothing accepted", () => expect(consentPrompt([], 4)).toBe("first"));
  it("update prompt when v3 accepted and v4 is current", () => expect(consentPrompt([3], 4)).toBe("update"));
  it("no prompt when current accepted", () => expect(consentPrompt([3, 4], 4)).toBeNull());
});

describe("latestConsent", () => {
  it("picks highest version", () =>
    expect(latestConsent([{ terms_version: 1, consented_at: "2026-01-01" }, { terms_version: 3, consented_at: "2026-05-01" }])?.terms_version).toBe(3));
  it("null when empty", () => expect(latestConsent([])).toBeNull());
});
