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
