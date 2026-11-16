import { describe, it, expect } from "vitest";
import { computeStats, lastByCode, isWorkoutExpanded, isProposalExpanded, workoutRecordingOrder, categoriesOf, categoryToken, formatDate, formatDateWithWeekday } from "@/lib/gym";
import history from "@/data/history.json";

const ex = [
  { code: "PU1", category: "Push", equipment: "Hantel" },
  { code: "PL1", category: "Pull", equipment: "Gymstick HG3.0" },
] as never[];
const log = [
  { code: "PU1", date: "2026-11-14", sets: 3, reps: 10, load: "20" },
  { code: "PL1", date: "2026-11-14", sets: 4, reps: 12, load: "30" },
  { code: "PU1", date: "2026-11-06", sets: 4, reps: 12, load: "15" },
] as never[];

describe("workout expansion", () => {
  it("opens only today's workout by default", () => {
    const overrides = new Map<string, boolean>();
    expect(isWorkoutExpanded("2026-11-15", "2026-11-15", overrides)).toBe(true);
    expect(isWorkoutExpanded("2026-11-14", "2026-11-15", overrides)).toBe(false);
    expect(isWorkoutExpanded("2026-11-16", "2026-11-15", overrides)).toBe(false);
  });
  it("allows opening older workouts and closing today's workout", () => {
    const overrides = new Map([["2026-11-14", true], ["2026-11-15", false]]);
    expect(isWorkoutExpanded("2026-11-14", "2026-11-15", overrides)).toBe(true);
    expect(isWorkoutExpanded("2026-11-15", "2026-11-15", overrides)).toBe(false);
  });
});

describe("suggested workout expansion", () => {
  it("opens only today's suggestion by default", () => {
    const overrides = new Map<string, boolean>();
    expect(isProposalExpanded("2026-11-16", "2026-11-16", overrides, "p1")).toBe(true);
    expect(isProposalExpanded("2026-11-17", "2026-11-16", overrides, "p1")).toBe(false);
    expect(isProposalExpanded("2026-11-15", "2026-11-16", overrides, "p1")).toBe(false);
  });
  it("keeps a clicked suggestion open or closed whatever its date", () => {
    const overrides = new Map([["p1", true], ["p2", false]]);
    expect(isProposalExpanded("2026-11-15", "2026-11-16", overrides, "p1")).toBe(true);
    expect(isProposalExpanded("2026-11-16", "2026-11-16", overrides, "p2")).toBe(false);
  });
});

describe("workout recording order", () => {
  it("shows the first recorded exercise at the top and last at the bottom without changing the source log", () => {
    const entries = [
      { code: "CO4", created_at: "2026-11-16T10:30:00Z" },
      { code: "PU1", created_at: "2026-11-16T10:00:00Z" },
      { code: "PL1", created_at: "2026-11-16T10:15:00Z" },
    ];
    expect(workoutRecordingOrder(entries).map((e) => e.code)).toEqual(["PU1", "PL1", "CO4"]);
    expect(entries.map((e) => e.code)).toEqual(["CO4", "PU1", "PL1"]);
  });
});

describe("date display", () => {
  it("shows every date as ISO 8601 with the full year", () => {
    expect(formatDate("2027-12-24")).toBe("2027-12-24");
    expect(formatDate("2027-12-24T18:00:00Z")).toBe("2027-12-24");
  });
  it("appends the weekday for logs, in the current language", () => {
    expect(formatDateWithWeekday("2026-11-14", "sv")).toBe("2026-11-14 · lör");
    expect(formatDateWithWeekday("2026-11-14", "en")).toBe("2026-11-14 · Sat");
  });
});

describe("category colors", () => {
  it("gives each training category its own color token in bank order", () => {
    const bank = [
      { code: "PU1", category: "Push" },
      { code: "PL1", category: "Pull" },
      { code: "LE1", category: "Legs" },
      { code: "CO1", category: "Core" },
    ] as never[];
    const cats = categoriesOf(bank);
    expect(categoryToken("Push", cats)).toBe("cat-1");
    expect(categoryToken("Pull", cats)).toBe("cat-2");
    expect(categoryToken("Legs", cats)).toBe("cat-3");
    expect(categoryToken("Core", cats)).toBe("cat-4");
  });
});

describe("stats", () => {
  it("counts repeat sets and multiplies reps by the repeat count", () => {
    const s = computeStats(log, ex);
    expect(s.totalSets).toBe(11);
    expect(s.totalReps).toBe(126);
    expect(s.sessions).toBe(2);
    expect(s.last).toBe("2026-11-14");
    expect(s.perCat.get("Push")).toBe(7);
  });
  it("PU3 at 15 kg with 12 reps twice counts as 2 sets and 24 reps", () => {
    const s = computeStats([{ code: "PU3", date: "2026-11-14", sets: 2, reps: 12, load: "15" }] as never[], []);
    expect(s.totalSets).toBe(2);
    expect(s.totalReps).toBe(24);
  });
  it("preserves Excel repeat counts: 72 rows, 213 sets, 2603 reps and 7 workouts", () => {
    const s = computeStats(history as never[], []);
    expect(history).toHaveLength(72);
    expect(s.totalSets).toBe(213);
    expect(s.totalReps).toBe(2603);
    expect(s.sessions).toBe(7);
  });
  it("last entry per exercise is the newest", () => {
    expect(lastByCode(log).get("PU1")?.load).toBe("20");
  });
});
