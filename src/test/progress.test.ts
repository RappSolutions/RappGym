import { describe, expect, it } from "vitest";
import { periodStart, progressByDay, weightKg } from "@/lib/progress";
import history from "@/data/history.json";
import type { LogEntry } from "@/lib/gym";

describe("progress from logs", () => {
  it("sums repeat counts by date, preserving all 213 Excel sets", () => {
    const days = progressByDay(history as LogEntry[]);
    expect(days).toHaveLength(7);
    expect(days.reduce((sum, day) => sum + day.sets, 0)).toBe(213);
    expect(days.map((day) => day.date)).toEqual([...new Set(history.map((entry) => entry.date))].sort());
  });
  it("compares only numeric kilogram loads, not bands or other units", () => {
    expect(weightKg("15,5 kg")).toBe(15.5);
    expect(weightKg("0")).toBe(0);
    for (const load of ["Orange", "15 lbs", "2 × 15", "", "-5", "15kg band"]) expect(weightKg(load)).toBeNull();
  });
  it("keeps exercises separate and uses the heaviest weight and summed sets per day", () => {
    const log = [
      { code: "PU3", date: "2026-11-14", sets: 2, load: "15" },
      { code: "PU3", date: "2026-11-14", sets: 1, load: "20" },
      { code: "PL1", date: "2026-11-14", sets: 4, load: "90" },
      { code: "PU3", date: "2026-11-03", sets: 4, load: "10" },
      { code: "PU3", date: "2026-11-15", sets: 1, load: "Orange" },
    ] as LogEntry[];
    expect(progressByDay(log, "PU3", "2026-11-14")).toEqual([
      { date: "2026-11-14", sets: 3, weight: 20 },
      { date: "2026-11-15", sets: 1, weight: null },
    ]);
  });
  it("includes today in a 30-day period", () => {
    expect(periodStart("2026-11-15", 30)).toBe("2026-10-17");
  });
});