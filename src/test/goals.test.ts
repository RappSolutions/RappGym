import { describe, expect, it } from "vitest";
import { isGoalOpen, sortGoals } from "@/lib/goals";
import { stationSteps } from "@/lib/circuit";

describe("goals", () => {
  it("sorts by target date, undated last, then by created date", () => {
    const g = [
      { id: "c", target_date: null, created_at: "2026-01-01" },
      { id: "b", target_date: "2027-12-24", created_at: "2026-01-02" },
      { id: "a", target_date: "2027-01-15", created_at: "2026-01-03" },
    ];
    expect(sortGoals(g).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("only active goals count as open", () => {
    expect(isGoalOpen({ status: "active" })).toBe(true);
    expect(isGoalOpen({ status: "fulfilled" })).toBe(false);
    expect(isGoalOpen({ status: "nevermind" })).toBe(false);
  });
});

describe("station mode", () => {
  it("does all sets of an exercise before the next", () => {
    expect(stationSteps([{ id: "A", sets: 2 }, { id: "B", sets: 1 }]).map((s) => s.row.id)).toEqual(["A", "A", "B"]);
  });
});
