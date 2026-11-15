import { describe, it, expect } from "vitest";
import { computeStats, lastByCode } from "@/lib/gym";

const ex = [
  { code: "PU1", category: "Push", equipment: "Hantel" },
  { code: "PL1", category: "Pull", equipment: "Gymstick HG3.0" },
] as never[];
const log = [
  { code: "PU1", date: "2026-11-14", sets: 3, reps: 10, load: "20" },
  { code: "PL1", date: "2026-11-14", sets: 4, reps: 12, load: "30" },
  { code: "PU1", date: "2026-11-06", sets: 4, reps: 12, load: "15" },
] as never[];

describe("stats", () => {
  it("counts sets, reps (sets × reps) and sessions like the Excel overview", () => {
    const s = computeStats(log, ex);
    expect(s.totalSets).toBe(11);
    expect(s.totalReps).toBe(30 + 48 + 48);
    expect(s.sessions).toBe(2);
    expect(s.last).toBe("2026-11-14");
    expect(s.perCat.get("Push")).toBe(7);
  });
  it("last entry per exercise is the newest", () => {
    expect(lastByCode(log).get("PU1")?.load).toBe("20");
  });
});
