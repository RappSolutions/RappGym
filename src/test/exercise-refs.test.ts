import { describe, expect, it } from "vitest";
import { nextExerciseCode, normalizeExercise } from "@/lib/exercise-refs";

describe("nextExerciseCode", () => {
  it("suggests PU11 after PU1..PU10", () => {
    expect(nextExerciseCode("PU", ["PU1", "PU2", "PU10", "PL9"])).toBe("PU11");
  });
  it("uses the category's own prefix, e.g. Pull -> PL", () => {
    expect(nextExerciseCode("PL", ["PU1", "PL1", "PL10", "PL3"])).toBe("PL11");
  });
  it("starts at 1 for a new prefix", () => {
    expect(nextExerciseCode("PO", ["PU1", "PL1"])).toBe("PO1");
  });
  it("ignores codes that only share the leading letters", () => {
    expect(nextExerciseCode("P", ["PU5", "PL7", "P2"])).toBe("P3");
  });
});

describe("normalizeExercise", () => {
  it("takes category and equipment from the FK rows", () => {
    const row = normalizeExercise({ category: "old", equipment: "old", cat: { name: "Push", code_prefix: "PU", color_token: "cat-1", sort_order: 1 }, eq: { name: "Hantel" } } as never);
    expect([row.category, row.equipment, row.category_token]).toEqual(["Push", "Hantel", "cat-1"]);
  });
});
