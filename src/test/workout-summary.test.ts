import { describe, expect, it } from "vitest";
import { summarizeWorkout } from "@/lib/workout-summary";

const row = (o: Partial<Parameters<typeof summarizeWorkout>[1][number]>) => ({ workout_id: "w", code: "PU1", sets: 1, reps: 10, load: "20", reps_unit: "reps", status: "completed", created_at: "2026-11-26T10:00:00Z", effort: null, ...o });
const cat = (c: string) => (c.startsWith("PU") ? "Push" : "Pull");

describe("summarizeWorkout", () => {
  const log = [
    row({ created_at: "2026-11-26T10:00:00Z", effort: 3 }),
    row({ created_at: "2026-11-26T10:10:00Z", load: "25", effort: 5 }),
    row({ code: "PL1", created_at: "2026-11-26T10:20:00Z", reps: 30, reps_unit: "seconds", load: "" }),
    row({ workout_id: "old", created_at: "2026-11-20T10:00:00Z", load: "22" }),
    row({ workout_id: "old", code: "PL1", created_at: "2026-11-20T10:00:00Z", load: "50" }),
  ];
  const s = summarizeWorkout("w", log, cat);
  it("sums tonnage, sets, reps and duration of this workout only", () => {
    expect(s).toMatchObject({ kg: 450, sets: 3, reps: 20, exercises: 2, minutes: 20, kgPerMin: 23 });
  });
  it("averages effort over sets that have one", () => {
    expect(s.avgEffort).toBe(4);
    expect(s.effortCounts).toEqual([0, 0, 1, 0, 1]);
  });
  it("reports a PR only when max kg beats earlier history", () => {
    expect(s.prs).toEqual([{ code: "PU1", kg: 25, previousKg: 22 }]);
  });
  it("reopening a historical workout ignores later records when comparing personal bests", () => {
    const later = row({ workout_id: "later", created_at: "2026-11-27T10:00:00Z", load: "100", effort: 1 });
    expect(summarizeWorkout("w", [...log, later], cat)).toEqual(s);
  });
  it("does not count a first-time exercise as PR", () => {
    expect(summarizeWorkout("w", log.filter((r) => r.workout_id === "w"), cat).prs).toEqual([]);
  });
  it("groups sets and tonnage per category", () => {
    expect(s.categories).toEqual([{ category: "Push", sets: 2, kg: 450 }, { category: "Pull", sets: 1, kg: 0 }]);
  });
});
