import { describe, expect, it } from "vitest";
import { DEFAULT_EFFORT, isEffort } from "./effort";
describe("effort", () => {
  it("defaults to the middle step 3", () => expect(DEFAULT_EFFORT).toBe(3));
  it("accepts 1..5 only", () => {
    expect([1, 5].every(isEffort)).toBe(true);
    expect([0, 6, 2.5, null].some(isEffort)).toBe(false);
  });
});
