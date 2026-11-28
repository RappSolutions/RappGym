import { describe, expect, it } from "vitest";
import { filterExerciseChoices, groupExerciseChoices } from "@/lib/exercise-selection";

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

describe("workout exercise grouping", () => {
  const choices = [
    { code: "A1", category_id: "push", category_sort: 2, equipment_id: "wall-bars", equipment: "Ribbstol" },
    { code: "B1", category_id: "pull", category_sort: 1, equipment_id: "wall-bars", equipment: "Ribbstol" },
    { code: "C1", category_id: "pull", category_sort: 1, equipment_id: "dumbbells", equipment: "Hantlar" },
    { code: "D1", category_id: "pull", category_sort: 1, equipment_id: null, equipment: "" },
  ];
  it("groups exercises across categories by equipment FK and sorts localized names", () => {
    const groups = groupExerciseChoices(choices, "equipment", (ex) => ex.equipment || "Kroppsvikt", "sv");
    expect(groups.map((group) => group.id)).toEqual(["equipment:dumbbells", "equipment:none", "equipment:wall-bars"]);
    expect(groups[2]?.exercises.map((ex) => ex.code)).toEqual(["A1", "B1"]);
  });
  it("retains database category order and the supplied exercise order", () => {
    const groups = groupExerciseChoices(choices, "category", (ex) => ex.category_id, "sv");
    expect(groups.map((group) => group.id)).toEqual(["category:pull", "category:push"]);
    expect(groups[0]?.exercises.map((ex) => ex.code)).toEqual(["B1", "C1", "D1"]);
  });
  it("never expands the supplied location-filtered choices", () => {
    const groups = groupExerciseChoices(choices.slice(0, 2), "equipment", (ex) => ex.equipment, "sv");
    expect(groups.flatMap((group) => group.exercises.map((ex) => ex.code))).toEqual(["A1", "B1"]);
  });
  it("keeps distinct equipment FKs separate even when names match", () => {
    const groups = groupExerciseChoices(choices.map((ex) => ({ ...ex, equipment: "Station" })), "equipment", (ex) => ex.equipment, "sv");
    expect(groups).toHaveLength(3);
  });
});