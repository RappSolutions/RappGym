import { describe, expect, it } from "vitest";
import { adjustLoad, circuitSteps } from "@/lib/circuit";

describe("circuit", () => {
  it("orders exercises lap by lap instead of all sets per exercise", () => {
    const steps = circuitSteps([{ id: "LE6", sets: 3 }, { id: "LE7", sets: 3 }]);
    expect(steps.map((s) => `${s.lap}${s.row.id}`)).toEqual(["1LE6", "1LE7", "2LE6", "2LE7", "3LE6", "3LE7"]);
  });
  it("drops an exercise after its own set count", () => {
    expect(circuitSteps([{ id: "A", sets: 2 }, { id: "B", sets: 1 }]).map((s) => s.row.id)).toEqual(["A", "B", "A"]);
  });
  it("steps kg loads up and down but never below zero", () => {
    expect(adjustLoad("20", 2.5)).toBe("22.5");
    expect(adjustLoad("1", -2.5)).toBe("0");
  });
});

import { remainingSteps as rs } from "@/lib/circuit";
import { circuitSteps as cs } from "@/lib/circuit";
describe("remainingSteps", () => {
  it("resumes after already completed sets", () => {
    const rows = [{ id: "a", code: "LE6", sets: 3 }, { id: "b", code: "PL1", sets: 3 }];
    const left = rs(cs(rows), new Map([["LE6", 2], ["PL1", 1]]));
    expect(left.map((s) => `${s.row.code}${s.lap}`)).toEqual(["PL12", "LE63", "PL13"]);
  });
});

import { workoutSetProgress, isWorkoutFinished } from "@/lib/circuit";
describe("workout set progress", () => {
  it("counts completed sets against planned sets", () => {
    const rows = [{ sets: 3 }, { sets: 3 }, { sets: 2 }];
    const log = [{ workout_id: "p", status: "completed", sets: 1 }, { workout_id: "p", status: "completed", sets: 1 }, { workout_id: "x", status: "completed", sets: 1 }];
    expect(workoutSetProgress("p", rows, log)).toEqual({ done: 2, total: 8 });
  });
  it("is finished at 10/10", () => { expect(isWorkoutFinished(10, 10)).toBe(true); expect(isWorkoutFinished(9, 10)).toBe(false); });
});
