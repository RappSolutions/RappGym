import { describe, expect, it } from "vitest";
import { logExportRows, workoutPrintHtml } from "./workout-export";

const ex = [{ id: "e1", code: "LE1", name: "Knäböj", category: "Legs", equipment: "Stång", reps_unit: "reps" }];

describe("log export", () => {
  it("sorts oldest first with ISO date and joins category/location", () => {
    const base = { code: "LE1", exercise_id: "e1", exercise_name: "Knäböj", gym_id: "g1", phase: "main", lap: 1, set_number: 1, load: "40", reps: 8, reps_unit: "reps", exercise_rating: null, note: null, workout: { title: "Ben" } };
    const rows = logExportRows([{ ...base, date: "2026-02-01", created_at: "2026-02-01T10:05:00Z" }, { ...base, date: "2026-01-01", created_at: "2026-01-01T09:00:00Z" }], ex, [{ id: "g1", name: "Hemma" }]);
    expect(rows[0]?.slice(0, 7)).toEqual(["2026-01-01", "09:00", "Hemma", "Ben", "main", "Legs", "LE1"]);
  });
});

describe("workout print", () => {
  it("renders one lap box per planned set and escapes text", () => {
    const html = workoutPrintHtml({ title: "<A>", date: "2026-03-01", labels: { lap: "Varv", note: "Not", phases: { main: "Träning" } } }, [{ code: "LE1", exercise_id: "e1", sets: 3, reps: 8, load: "40 kg", note: null, phase: "main" }], ex);
    expect(html).toContain("&#60;A&#62;");
    expect(html.match(/class="box"/g)?.length).toBe(3);
    expect(html).toContain("40 kg × 8");
  });
});
