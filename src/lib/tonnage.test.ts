import { describe, expect, it } from "vitest";
import { rowTonnage, tonnageSummary } from "./tonnage";

describe("tonnage", () => {
  it("sums each set row by its own reps and kg (pyramid)", () => {
    const s = tonnageSummary([{ sets: 1, reps: 12, load: "60", created_at: "2026-01-01T10:00:00Z" }, { sets: 1, reps: 10, load: "70 kg", created_at: "2026-01-01T10:05:00Z" }, { sets: 1, reps: 8, load: "80", created_at: "2026-01-01T10:10:00Z" }]);
    expect(s).toEqual({ kg: 2060, sets: 3, minutes: 10, kgPerMin: 206 });
  });
  it("excludes time-based and bodyweight rows", () => {
    expect(rowTonnage({ sets: 1, reps: 5, load: "20", reps_unit: "min" })).toBe(0);
    expect(rowTonnage({ sets: 1, reps: 10, load: "KV" })).toBe(0);
  });
  it("multiplies grouped rows by sets", () => {
    expect(rowTonnage({ sets: 3, reps: 10, load: "40" })).toBe(1200);
  });
});
