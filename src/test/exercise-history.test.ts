import { describe, expect, it } from "vitest";
import type { Exercise, LogEntry } from "@/lib/gym";
import { exerciseHistory, formatExerciseResult } from "@/lib/exercise-history";

const unitLabel = (unit: "sec" | "min") => unit === "sec" ? "sek" : "min";

describe("exercise results", () => {
  it("MB3: shows 5 min without a missing-load dash", () => {
    expect(formatExerciseResult({ reps: 5, load: "", reps_unit: "min" }, unitLabel)).toBe("5 min");
  });
  it("adds units for seconds, but not plain counts", () => {
    expect(formatExerciseResult({ reps: 30, load: "", reps_unit: "sec" }, unitLabel)).toBe("30 sek");
    expect(formatExerciseResult({ reps: 10, load: "", reps_unit: "reps" }, unitLabel)).toBe("10");
  });
  it("does not show a dash for a missing quantity", () => {
    expect(formatExerciseResult({ reps: null, load: "20 kg", reps_unit: "reps" }, unitLabel)).toBe("20 kg");
  });
});

describe("exercise history", () => {
  it("includes only completed work for the selected FK, even if codes changed", () => {
    const exercise = { id: "mb3", code: "MB3" } as Exercise;
    const log = [
      { id: "done", exercise_id: "mb3", code: "old-code", status: "completed" },
      { id: "plan", exercise_id: "mb3", code: "MB3", status: "suggested" },
      { id: "other", exercise_id: "other", code: "MB3", status: "completed" },
    ] as LogEntry[];
    expect(exerciseHistory(log, exercise).map((entry) => entry.id)).toEqual(["done"]);
  });
});