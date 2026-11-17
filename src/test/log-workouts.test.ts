import { describe, expect, it } from "vitest";
import { groupLogByWorkout, replanRows } from "@/lib/log-workouts";

const r = (id: string, date: string, created_at: string, workout_id: string | null) => ({ id, date, created_at, workout_id });

describe("log per workout", () => {
  it("groups rows by workout and loose rows by date, newest first", () => {
    const g = groupLogByWorkout([r("1", "2026-11-14", "2026-11-14T10:00:00Z", "w1"), r("2", "2026-11-14", "2026-11-14T10:05:00Z", "w1"), r("3", "2026-11-14", "2026-11-14T18:00:00Z", null), r("4", "2026-11-16", "2026-11-16T09:00:00Z", "w2")]);
    expect(g.map((x) => x.key)).toEqual(["w2", "day:2026-11-14", "w1"]);
    expect(g[2]?.entries).toHaveLength(2);
  });
  it("replans with sets actually done per exercise and the latest load", () => {
    const rows = replanRows([
      { code: "LE6", sets: 1, reps: 12, load: "40", created_at: "2026-11-14T10:00:00Z" },
      { code: "PL1", sets: 1, reps: 10, load: "30", created_at: "2026-11-14T10:02:00Z" },
      { code: "LE6", sets: 1, reps: 10, load: "45", created_at: "2026-11-14T10:10:00Z" },
    ]);
    expect(rows).toEqual([{ code: "LE6", sets: 2, reps: 10, load: "45" }, { code: "PL1", sets: 1, reps: 10, load: "30" }]);
  });
});
