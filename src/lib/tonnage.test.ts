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

import { densityByWorkout, isoWeek, tonnageByDay, tonnageByWeek } from "./tonnage";
describe("tonnage series", () => {
  const r = (date: string, reps: number, load: string, created_at: string, workout_id = date) => ({ date, reps, load, sets: 1, created_at, workout_id, status: "completed" });
  const rows = [r("2026-11-23", 10, "20", "2026-11-23T10:00:00Z"), r("2026-11-23", 10, "20", "2026-11-23T10:10:00Z"), r("2026-11-25", 5, "40", "2026-11-25T10:00:00Z"), { ...r("2026-11-25", 10, "99", "2026-11-25T10:05:00Z"), status: "suggested" }];
  it("sums per day, ignoring suggestions", () => expect(tonnageByDay(rows)).toEqual([{ date: "2026-11-23", kg: 400 }, { date: "2026-11-25", kg: 200 }]));
  it("ISO weeks", () => { expect(isoWeek("2026-11-23")).toBe("2026-W48"); expect(isoWeek("2027-01-01")).toBe("2026-W53"); });
  it("sums per week", () => expect(tonnageByWeek(rows)).toEqual([{ week: "2026-W48", kg: 600 }]));
  it("density skips workouts without duration", () => expect(densityByWorkout(rows)).toEqual([{ date: "2026-11-23", kgPerMin: 40 }]));
});

import { fillDays as _fd, fillWeeks as _fw } from "./tonnage";
describe("calendar axis", () => {
  it("fills rest days with null so 21→24 is three steps", () => {
    const r = _fd([{ x: "2026-11-21", v: 1 }, { x: "2026-11-24", v: 2 }, { x: "2026-11-25", v: 3 }]);
    expect(r.map((p) => p.x)).toEqual(["2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(r[1]!.v).toBeNull();
  });
  it("fills empty ISO weeks", () => {
    const r = _fw([{ x: "2026-W44", v: 5 }, { x: "2026-W46", v: 7 }], "2026-10-26", "2026-11-09");
    expect(r).toEqual([{ x: "2026-W44", v: 5 }, { x: "2026-W45", v: null }, { x: "2026-W46", v: 7 }]);
  });
});
