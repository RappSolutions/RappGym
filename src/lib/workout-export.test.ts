import { describe, expect, it } from "vitest";
import { logExportRows, workoutSheet } from "./workout-export";

const ex = [{ id: "e1", code: "LE1", name: "Knäböj", category: "Legs", equipment: "Stång", reps_unit: "reps" }];

describe("log export", () => {
  it("sorts oldest first with ISO date and joins category/location", () => {
    const base = { code: "LE1", exercise_id: "e1", exercise_name: "Knäböj", gym_id: "g1", phase: "main", lap: 1, set_number: 1, load: "40", reps: 8, reps_unit: "reps", exercise_rating: null, note: null, workout: { title: "Ben" } };
    const rows = logExportRows([{ ...base, date: "2026-02-01", created_at: "2026-02-01T10:05:00Z" }, { ...base, date: "2026-01-01", created_at: "2026-01-01T09:00:00Z" }], ex, [{ id: "g1", name: "Hemma" }]);
    expect(rows[0]?.slice(0, 7)).toEqual(["2026-01-01", "09:00", "Hemma", "Ben", "main", "Legs", "LE1"]);
  });
});

describe("workout sheet", () => {
  it("one set per exercise per lap in circuit order: 2 exercises × 3 laps = 6 sets", () => {
    const s = workoutSheet({ title: "Ben", date: "2026-03-01", labels: { lap: "Varv", note: "Not", phases: { main: "Träning" } } }, [
      { code: "LE1", exercise_id: "e1", sets: 3, reps: 8, load: "40 kg", note: null, phase: "main" },
      { code: "LE2", exercise_id: "e2", sets: 3, reps: 10, load: "", note: null, phase: "main" }], ex);
    expect(s.sets.map((x) => `${x.lap}${x.code}`)).toEqual(["1LE1", "1LE2", "2LE1", "2LE2", "3LE1", "3LE2"]);
    expect(s.sets[0]?.target).toBe("40 kg × 8");
  });
});
