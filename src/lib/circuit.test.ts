import { describe, expect, it } from "vitest";
import { defaultPlannedSets } from "./circuit";

describe("defaultPlannedSets", () => {
  it("spontaneous workouts always start at 1 set, in circuit mode", () => {
    expect(defaultPlannedSets({ spontaneous: true, circuit: true, laps: 4 })).toBe(1);
  });

  it("spontaneous workouts always start at 1 set, in station mode", () => {
    expect(defaultPlannedSets({ spontaneous: true, circuit: false, laps: 4 })).toBe(1);
  });

  it("planned circuit workouts use the lap count", () => {
    expect(defaultPlannedSets({ spontaneous: false, circuit: true, laps: 4 })).toBe(4);
  });

  it("planned station workouts default to 3 sets", () => {
    expect(defaultPlannedSets({ spontaneous: false, circuit: false, laps: 4 })).toBe(3);
  });
});
