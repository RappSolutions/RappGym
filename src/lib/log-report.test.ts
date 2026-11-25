import { describe, expect, it } from "vitest";
import { buildLogReport, isoWeekday, weekMonday } from "./log-report";

const ex = [{ id: "e1", code: "LE1", name: "Knäböj", category: "Legs", equipment: "Skivstång" }, { id: "e2", code: "PU1", name: "Press", category: "Push", equipment: "Bröstpress" }];
const row = (date: string, t: string, id: string, load: string, w = "w1") => ({ date, created_at: `${date}T${t}:00Z`, code: id === "e1" ? "LE1" : "PU1", exercise_id: id, exercise_name: "", gym_id: "g1", workout_id: w, reps: 10, load, reps_unit: "reps", exercise_rating: null, sets: 1 });
const days = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"];

describe("log report", () => {
  it("weeks start on Monday", () => {
    expect(isoWeekday("2026-11-23")).toBe(1);
    expect(isoWeekday("2026-11-29")).toBe(7);
    expect(weekMonday("2026-11-29")).toBe("2026-11-23");
    expect(weekMonday("2026-11-23")).toBe("2026-11-23");
  });
  it("Sunday and the following Monday land in different weeks", () => {
    const r = buildLogReport([row("2026-11-29", "10:00", "e1", "40", "a"), row("2026-11-30", "10:00", "e1", "40", "b")], ex, [{ id: "g1", name: "Hemma" }], days);
    expect(r.weeks.map((w) => w[0])).toEqual(["2026-W48", "2026-W49"]);
    expect(r.weekdayRows[6]?.[1]).toBe(1);
    expect(r.weekdayRows[0]?.[1]).toBe(1);
  });
  it("summarises a workout, exercise PB and category shares", () => {
    const r = buildLogReport([row("2026-11-24", "10:00", "e1", "40"), row("2026-11-24", "10:10", "e1", "50"), row("2026-11-24", "10:20", "e2", "20")], ex, [{ id: "g1", name: "Hemma" }], days);
    expect(r.workouts[0]).toEqual(["2026-11-24", "tis", "2026-W48", "Hemma", "", 3, 2, 20, 1100, 55, ""]);
    const sq = r.perExercise.find((x) => x[0] === "LE1")!;
    expect([sq[9], sq[12], sq[13]]).toEqual([50, 10, 900]);
    expect(r.categories[0]).toEqual(["Legs", 2, 66.7, 900, 81.8, 450]);
  });
});
