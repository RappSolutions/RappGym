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
  it("one lap column per max set, dash where a row has fewer, target with load × reps", () => {
    const s = workoutSheet({ title: "Ben", date: "2026-03-01", labels: { lap: "Varv", note: "Not", phases: { main: "Träning" } } }, [
      { code: "LE1", exercise_id: "e1", sets: 3, reps: 8, load: "40 kg", note: null, phase: "main" },
      { code: "LE1", exercise_id: "e1", sets: 1, reps: 8, load: "", note: null, phase: "main" }], ex);
    expect(s.head.filter((h) => h.startsWith("Varv")).length).toBe(3);
    expect(s.sections[0]?.body[0]?.[2]).toBe("40 kg × 8");
    expect(s.sections[0]?.body[1]?.slice(4, 7)).toEqual(["", "—", "—"]);
  });
});
