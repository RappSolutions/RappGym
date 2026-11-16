import { describe, expect, it } from "vitest";
import { filterExerciseChoices } from "@/lib/exercise-selection";

const exercises = [
  { code: "A1", name: "Press", category: "Push" },
  { code: "A2", name: "Press", category: "Legs" },
  { code: "B1", name: "Row", category: "Pull" },
];
describe("progress exercise selection", () => {
  it("finds names and codes without case sensitivity", () => {
    expect(filterExerciseChoices(exercises, " press ", null).map((exercise) => exercise.code)).toEqual(["A1", "A2"]);
    expect(filterExerciseChoices(exercises, "b1", null).map((exercise) => exercise.code)).toEqual(["B1"]);
  });
  it("limits matching results to the selected category", () => {
    expect(filterExerciseChoices(exercises, "press", "Legs").map((exercise) => exercise.code)).toEqual(["A2"]);
  });
});