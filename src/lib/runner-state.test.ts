import { describe, expect, it } from "vitest";
import { completedStepKeys, emptyRunnerState, lapMinutes, logSectionHeaders, parseRunnerState, remainingLapMinutes } from "./runner-state";
import { workoutSteps } from "./circuit";

describe("runner recovery", () => {
  it("restores cursor, skipped steps, inputs and timing after a reload", () => {
    const state = { ...emptyRunnerState(), cursor: "exercise:3", fromIdx: 4, skipped: ["exercise:1"], lapStartedAt: 1000, lapKey: "main:2", loads: [["exercise", "20"]], reps: [["exercise", 10]] };
    expect(parseRunnerState(JSON.stringify(state))).toEqual(state);
  });
  it("ignores malformed storage", () => expect(parseRunnerState("broken")).toEqual(emptyRunnerState()));
});
describe("lap timing", () => {
  it("includes exercise one, from actual lap start to completion", () => expect(lapMinutes(0, 660000)).toBe(11));
  it("never invents an unknown start", () => expect(lapMinutes(null, 660000)).toBeNull());
  it("two remaining 11-minute laps plus one minute rest each means 24 minutes", () => expect(remainingLapMinutes([11], 2, false)).toBe(24));
  it("never gives a spontaneous workout a fictional finish estimate", () => expect(remainingLapMinutes([11], 2, true)).toBeNull());
});
describe("factual set positions", () => {
  const steps = workoutSteps([{ id: "row", exercise_id: "exercise", code: "MB5", phase: "main", sets: 3 }], true);
  it("logging set 2 does not turn skipped set 1 into a completed set", () => {
    expect([...completedStepKeys(steps, [{ exercise_id: "exercise", code: "MB5", phase: "main", set_number: 2, sets: 1 }])]).toEqual(["row:2"]);
  });
  it("allocates legacy completed repeats only in memory", () => {
    const logs = [{ exercise_id: "exercise", code: "MB5", phase: "main", set_number: null, sets: 2 }];
    expect([...completedStepKeys(steps, logs)]).toEqual(["row:1", "row:2"]);
    expect(logs[0]?.set_number).toBeNull();
  });
});
describe("log section boundaries", () => {
  it("infers display-only circuit laps from individual repeats without modifying historical facts", () => {
    const rows = ["A", "B", "A", "B"].map((code, i) => ({ code, phase: "main", lap: null, sets: 1, created_at: `2026-11-22T10:0${i}:00Z` }));
    expect(logSectionHeaders(rows, true)).toEqual([{ phase: null, lap: 1, estimated: true }, null, { phase: null, lap: 2, estimated: true }, null]);
    expect(rows.map((r) => r.lap)).toEqual([null, null, null, null]);
    expect(logSectionHeaders(rows, false)).toEqual([null, null, null, null]);
  });
  it("never infers laps from aggregated imported sets", () => {
    const rows = ["A", "B", "A"].map((code, i) => ({ code, phase: "main", lap: null, sets: 3, created_at: `2026-11-22T10:0${i}:00Z` }));
    expect(logSectionHeaders(rows, true)).toEqual([null, null, null]);
  });
  it("omits a single phase and lap", () => expect(logSectionHeaders([{ phase: "main", lap: 1 }])).toEqual([null]));
  it("marks the first entry of each lap without repeating phase labels", () => expect(logSectionHeaders([{ phase: "main", lap: 1 }, { phase: "main", lap: 1 }, { phase: "main", lap: 2 }])).toEqual([{ phase: null, lap: 1 }, null, { phase: null, lap: 2 }]));
  it("shows multiple phases, leaving unknown historical laps unknown", () => expect(logSectionHeaders([{ phase: "intro", lap: null }, { phase: "main", lap: null }])).toEqual([{ phase: "intro", lap: null }, { phase: "main", lap: null }]));
});