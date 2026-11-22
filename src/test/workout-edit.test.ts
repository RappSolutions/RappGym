import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canMove, nextOrder, reorderRows } from "@/lib/workout-edit";

const rows = [{ id: "a", proposal_order: 0 }, { id: "b", proposal_order: 1 }, { id: "c", proposal_order: 2 }];
describe("workout editing", () => {
  it("moves a row down by swapping with the next", () => {
    expect(reorderRows(rows, "a", 1)).toEqual([{ id: "b", proposal_order: 0 }, { id: "a", proposal_order: 1 }]);
  });
  it("does nothing when moving the first row up", () => {
    expect(reorderRows(rows, "a", -1)).toEqual([]);
  });
  it("appends new exercises after the last one", () => {
    expect(nextOrder(rows)).toBe(3);
    expect(nextOrder([])).toBe(0);
  });
  it("appends after legacy rows that have no order", () => {
    expect(nextOrder([{ proposal_order: null }, { proposal_order: null }])).toBe(2);
  });
  it("keeps moves inside the row's phase", () => {
    const p = [{ id: "i", proposal_order: 0, phase: "intro" }, { id: "m1", proposal_order: 1, phase: "main" }, { id: "m2", proposal_order: 2, phase: "main" }, { id: "o", proposal_order: 3, phase: "outro" }];
    expect(canMove(p, "m1", -1)).toBe(false);
    expect(canMove(p, "m2", 1)).toBe(false);
    expect(canMove(p, "m1", 1)).toBe(true);
    expect(reorderRows(p, "m1", -1)).toEqual([]);
  });
});

import { toPlannedRow } from "@/lib/gym";
describe("planned rows come from workout_exercises", () => {
  it("maps targets, order and the workout's date/gym, never a log status", () => {
    const row = toPlannedRow({ id: "p", user_id: "u", workout_id: "w", exercise_id: "e", phase: "outro", sort_order: 4, target_sets: 3, target_reps: 12, target_load: "20", note: null, created_at: "2026-11-22T10:00:00Z", ex: { code: "PL7" }, workout: { id: "w", title: "T", created_by: "ai", is_circuit: true, scheduled_date: "2026-11-23", created_at: "2026-11-20T10:00:00Z", gym_id: "g", completed_at: null } });
    expect(row).toMatchObject({ code: "PL7", sets: 3, reps: 12, load: "20", phase: "outro", proposal_order: 4, date: "2026-11-23", gym_id: "g", workout_id: "w", status: "suggested" });
  });
});
