import { describe, expect, it } from "vitest";
import { defaultPlannedSets, newExercisePhase } from "./circuit";

describe("newExercisePhase", () => {
  it("always uses main for spontaneous workouts", () => {
    expect(newExercisePhase(true, "intro")).toBe("main");
    expect(newExercisePhase(true, "outro")).toBe("main");
  });

  it("preserves the selected phase in planned workouts", () => {
    expect(newExercisePhase(false, "intro")).toBe("intro");
    expect(newExercisePhase(false, "outro")).toBe("outro");
  });
});

describe("defaultPlannedSets", () => {
  it("intro and outro default to one set even when training has four laps", () => {
    expect(defaultPlannedSets({ spontaneous: false, circuit: true, laps: 4, phase: "intro" })).toBe(1);
    expect(defaultPlannedSets({ spontaneous: false, circuit: true, laps: 4, phase: "outro" })).toBe(1);
  });
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
