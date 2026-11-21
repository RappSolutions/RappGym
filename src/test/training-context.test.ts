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
    expect(facts.lastLoads).toEqual([
      { code: "PU3", gymId: "A", kg: 15, date: "2026-11-14" },
      { code: "PU3", gymId: "B", kg: 90, date: "2026-11-14" },
    ]);
  });
  it("sends only the latest kg per exercise and gym, however long the history", () => {
    const log = [
      { code: "PU3", gym_id: "A", date: "2024-01-02", sets: 1, load: "10" },
      { code: "PU3", gym_id: "A", date: "2026-11-14", sets: 1, load: "20" },
    ] as LogEntry[];
    expect(trainingContext(log, [], null).lastLoads).toEqual([{ code: "PU3", gymId: "A", kg: 20, date: "2026-11-14" }]);
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

describe("AI exercise ratings", () => {
  const ex = [{ id: "a", code: "CA1" }, { id: "b", code: "PU1" }, { id: "c", code: "PL1" }, { id: "d", code: "LE1" }];
  it("never sends rating 1 (Aldrig) exercises to AI", async () => {
    const { aiExercisePool, ratingMap } = await import("@/lib/exercise-preferences");
    expect(aiExercisePool(ex, ratingMap([{ exercise_id: "a", rating: 1 }])).pool.map((e) => e.code)).toEqual(["PU1", "PL1", "LE1"]);
  });
  it("marks 5 as always, 4 as often, 2 as rarely and treats missing as normal", async () => {
    const { aiExercisePool, ratingMap } = await import("@/lib/exercise-preferences");
    expect(aiExercisePool(ex, ratingMap([{ exercise_id: "b", rating: 5 }, { exercise_id: "c", rating: 4 }, { exercise_id: "d", rating: 2 }])).priorities)
      .toEqual({ always: ["PU1"], often: ["PL1"], rarely: ["LE1"] });
  });
});

import { RATINGS_DESC } from "@/lib/exercise-preferences";
describe("rating display order", () => {
  it("lists 100% first and Aldrig last", () => { expect(RATINGS_DESC).toEqual([5, 4, 3, 2, 1]); });
});
