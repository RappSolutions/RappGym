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
    const row = normalizeExercise({ category: "old", equipment: "old", cat: { name: "Push", code_prefix: "PU", color_token: "cat-1", sort_order: 1, translations: {} }, eq: { name: "Dumbbell", translations: { sv: { name: "Hantel" } } } } as never);
    expect([row.category, row.equipment, row.category_token]).toEqual(["Push", "Dumbbell", "cat-1"]);
  });
});

import { nextCodeNumber } from "@/lib/exercise-refs";
describe("nextCodeNumber", () => {
  const bank = [{ id: "a", category_id: "PU", code_number: 10 }, { id: "b", category_id: "PU", code_number: 2 }, { id: "c", category_id: "PL", code_number: 30 }];
  it("suggests max + 1 within the category only", () => expect(nextCodeNumber("PU", bank)).toBe(11));
  it("starts at 1 for an empty category", () => expect(nextCodeNumber("CO", bank)).toBe(1));
  it("ignores the edited exercise itself", () => expect(nextCodeNumber("PU", bank, "a")).toBe(3));
});

import { toLogEntry } from "@/lib/log-entry";
describe("toLogEntry", () => {
  it("keeps the recorded code for history and exposes the current code for lookups", () => {
    const r = toLogEntry({ code: "PU3", ex: { code: "PU7" } } as never) as unknown as { code: string; recorded_code: string };
    expect(r.recorded_code).toBe("PU3");
    expect(r.code).toBe("PU7");
  });
});

import { loggedName } from "@/lib/log-entry";
describe("loggedName", () => {
  it("keeps the name recorded at workout time after a rename", () => {
    expect(loggedName({ exercise_name: "Situps" }, { name: "Tough belly work" }, { name: "Tough belly work" })).toBe("Situps");
  });
  it("uses the localized name while the snapshot matches the current name", () => {
    expect(loggedName({ exercise_name: "Situps" }, { name: "Situps" }, { name: "Sit-ups EN" })).toBe("Sit-ups EN");
  });
});

import { translated } from "@/lib/exercise-refs";
describe("translated", () => {
  const tr = { sv: { name: "Hantel" } };
  it("uses the Swedish translation for sv", () => expect(translated(tr, "sv", "name", "Dumbbell")).toBe("Hantel"));
  it("falls back to the English base when a language is missing", () => expect(translated(tr, "fi", "name", "Dumbbell")).toBe("Dumbbell"));
  it("returns the English base for en", () => expect(translated(tr, "en", "name", "Dumbbell")).toBe("Dumbbell"));
});
