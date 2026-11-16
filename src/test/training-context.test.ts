import { describe, expect, it } from "vitest";
import { trainingContext } from "@/lib/training-context";
import type { Exercise, LogEntry } from "@/lib/gym";
import history from "@/data/history.json";

describe("AI training facts", () => {
  it("preserves the 213 repeat-count sets and seven imported workouts", () => {
    const facts = trainingContext(history as LogEntry[], [], null);
    expect(facts.totalSets).toBe(213);
    expect(facts.workoutCount).toBe(7);
  });
  it("never mixes weights across exercises or gyms and excludes text loads", () => {
    const log = [
      { code: "PU3", gym_id: "A", date: "2026-11-14", sets: 2, load: "15" },
      { code: "PU3", gym_id: "B", date: "2026-11-14", sets: 1, load: "90" },
      { code: "PL1", gym_id: "A", date: "2026-11-14", sets: 4, load: "Orange" },
    ] as LogEntry[];
    const facts = trainingContext(log, [], null);
    expect(facts.weightsByExerciseAndGym).toEqual([
      { code: "PU3", gymId: "A", days: [{ date: "2026-11-14", sets: 2, weight: 15 }] },
      { code: "PU3", gymId: "B", days: [{ date: "2026-11-14", sets: 1, weight: 90 }] },
      { code: "PL1", gymId: "A", days: [] },
    ]);
  });
  it("offers every database exercise at any location", () => {
    const exercises = [{ code: "PU3", is_active: true }, { code: "PL1", is_active: true }, { code: "CO1", is_active: true }] as Exercise[];
    expect(trainingContext([], exercises, "A").availableExerciseCodes).toEqual(["PU3", "PL1", "CO1"]);
  });
  it("never offers inactive (hidden) exercises to AI planning", () => {
    const exercises = [{ code: "PU3", is_active: true }, { code: "OLD", is_active: false }] as Exercise[];
    expect(trainingContext([], exercises, "A").availableExerciseCodes).toEqual(["PU3"]);
  });
});
