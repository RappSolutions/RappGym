import { describe, expect, it } from "vitest";
import { exercisesAtLocation, missingLinks } from "@/lib/exercise-locations";

const ex = [{ id: "a" }, { id: "b" }, { id: "c" }];
const links = [{ exercise_id: "a", gym_id: "G1" }, { exercise_id: "b", gym_id: "G2" }];

describe("exercises per location", () => {
  it("shows only the exercises linked to a location", () => {
    expect(exercisesAtLocation(ex, links, "G1").map((e) => e.id)).toEqual(["a"]);
  });
  it("shows every exercise when no location is chosen", () => {
    expect(exercisesAtLocation(ex, links, null)).toHaveLength(3);
  });
  it("adding all exercises to a location only adds the missing ones", () => {
    expect(missingLinks(["a", "b", "c"], links, "G1")).toEqual([{ exercise_id: "b", gym_id: "G1" }, { exercise_id: "c", gym_id: "G1" }]);
  });
});
