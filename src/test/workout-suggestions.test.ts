import { describe, expect, it } from "vitest";
import { analysisDateTime, suggestionRows, removableSuggestionIds } from "@/lib/workout-suggestions";
import { computeStats, lastByCode, type LogEntry } from "@/lib/gym";
import { dashboardStats } from "@/lib/dashboard";
import { progressByDay } from "@/lib/progress";
import { trainingContext } from "@/lib/training-context";

const rows = [
  { code: "A", date: "2026-11-16", status: "suggested", sets: 5, reps: 20, load: "80", gym_id: null },
  { code: "A", date: "2026-11-15", status: "completed", sets: 2, reps: 12, load: "15", gym_id: null },
] as LogEntry[];

describe("saved suggestions", () => {
  it("removes only uncompleted exercises in the selected proposal", () => {
    expect(removableSuggestionIds([
      { id: "pending", status: "suggested", workout_id: "selected" },
      { id: "done", status: "completed", workout_id: "selected" },
      { id: "other", status: "suggested", workout_id: "other-plan" },
    ], "selected")).toEqual(["pending"]);
  });
  it("stores planned date, dose, suggestion status and exercise order without recording completed work", () => {
    const result = suggestionRows([{ code: "A", phase: "main", sets: 2, reps: 12, load: "15", reason: "Balance" }], "2026-11-16", 3, null, "plan-id");
    expect(result[0]).toEqual({ code: "A", phase: "main", sets: 2, reps: 12, load: "15", note: "Balance", date: "2026-11-19", status: "suggested", gym_id: null, workout_id: "plan-id", proposal_order: 0 });
  });
  it("counts only completed work in every statistical surface", () => {
    expect(computeStats(rows, []).totalSets).toBe(2);
    expect(computeStats(rows, []).totalReps).toBe(24);
    expect(computeStats(rows, []).sessions).toBe(1);
    expect(dashboardStats(rows, [], "2026-11-16").totalSets).toBe(2);
    expect(dashboardStats(rows, [], "2026-11-16").lastDate).toBe("2026-11-15");
    expect(progressByDay(rows)).toEqual([{ date: "2026-11-15", sets: 2, weight: 15 }]);
  });
  it("excludes planned doses from latest-set prefills and AI facts", () => {
    expect(lastByCode(rows).get("A")?.load).toBe("15");
    expect(trainingContext(rows, [], null).totalSets).toBe(2);
    expect(trainingContext(rows, [], null).recentLogs).toHaveLength(1);
  });
  it("includes verified work once its status becomes completed", () => {
    const verified = rows.map((row) => ({ ...row, status: "completed" }));
    expect(computeStats(verified, []).totalSets).toBe(7);
    expect(computeStats(verified, []).totalReps).toBe(124);
  });
  it("shows the analysis date with local 24-hour HH:mm", () => {
    expect(analysisDateTime(new Date(2026, 10, 16, 12, 7).toISOString())).toBe("2026-11-16 12:07");
  });
});