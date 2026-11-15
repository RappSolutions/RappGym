import { describe, expect, it } from "vitest";
import { dashboardStats } from "@/lib/dashboard";
import type { Exercise, LogEntry } from "@/lib/gym";

const e = (date: string, code: string, sets: number, reps: number) => ({ date, code, sets, reps }) as LogEntry;
const ex = [{ code: "PU1", category: "Push" }, { code: "LE1", category: "Legs" }] as Exercise[];
const log = [e("2026-11-03", "PU1", 4, 10), e("2026-11-10", "LE1", 2, 12), e("2026-11-14", "PU1", 1, 8)];

describe("dashboardStats", () => {
  const s = dashboardStats(log, ex, "2026-11-15");
  it("sums repeat counts, not rows", () => { expect(s.totalSets).toBe(7); expect(s.totalReps).toBe(72); });
  it("counts workouts this Monday-based week", () => expect(s.workoutsThisWeek).toBe(2));
  it("counts days since last workout", () => expect(s.daysSinceLast).toBe(1));
  it("counts consecutive weeks with workouts", () => expect(s.weekStreak).toBe(2));
  it("splits sets by category over 30 days", () => expect(s.perCategory30.get("Push")).toBe(5));
});
