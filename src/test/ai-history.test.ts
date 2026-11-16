import { expect, it } from "vitest";
import { unacceptedWorkoutKeys } from "@/lib/ai-history";

it("accepts all remaining workouts while skipping individually accepted or completed workouts", () => {
  expect(unacceptedWorkoutKeys(["0", "1", "2", "3"], new Set(["1", "3"]))).toEqual(["0", "2"]);
  expect(unacceptedWorkoutKeys(["0", "1"], new Set(["0", "1"]))).toEqual([]);
});