import { describe, expect, it } from "vitest";
import { exercisesAtLocation } from "@/lib/exercise-locations";

const ex = [{ id: "a", equipment_id: "cable" }, { id: "b", equipment_id: "press" }, { id: "c", equipment_id: null }];
const links = [{ gym_id: "G1", equipment_id: "cable" }, { gym_id: "G2", equipment_id: "press" }];

describe("exercisesAtLocation", () => {
  it("keeps exercises whose equipment is at the location plus equipment-free ones", () => {
    expect(exercisesAtLocation(ex, links, "G1").map((e) => e.id)).toEqual(["a", "c"]);
  });
  it("location without equipment only offers equipment-free exercises", () => {
    expect(exercisesAtLocation(ex, links, "G3").map((e) => e.id)).toEqual(["c"]);
  });
  it("no location means every exercise", () => {
    expect(exercisesAtLocation(ex, links, null)).toHaveLength(3);
  });
});
