import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Exercise, LogEntry } from "@/lib/gym";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), rollback: vi.fn(), plan: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  if (table !== "workouts") throw new Error(`Unexpected write: ${table}`);
  return { insert: (row: unknown) => { mocks.insert(row); return { select: () => ({ single: async () => ({ data: { id: "new-workout" }, error: null }) }) }; }, delete: () => ({ eq: mocks.rollback }) };
} } }));
vi.mock("@/lib/workout-edit", () => ({ insertPlannedExercises: mocks.plan }));
import { createSpontaneousWorkout, spontaneousFirstExercise } from "@/lib/spontaneous-workout";

beforeEach(() => { vi.clearAllMocks(); mocks.plan.mockResolvedValue(undefined); mocks.rollback.mockResolvedValue({ error: null }); });

describe("selected-exercise spontaneous start", () => {
  const exercise = { id: "mb3", code: "MB3", reps_unit: "min" } as Exercise;
  const last = { load: "", reps: 5, sets: 4 } as LogEntry;
  it("starts with the clicked exercise, one planned set and previous targets", () => {
    expect(spontaneousFirstExercise(exercise, last)).toEqual({ code: "MB3", sets: 1, reps: 5, load: "", phase: "main" });
  });
  it("writes only the workout and plan, never completed log entries", async () => {
    expect(await createSpontaneousWorkout("location", "Spontanpass", exercise, last)).toBe("new-workout");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ gym_id: "location", is_spontaneous: true, is_circuit: true }));
    expect(mocks.plan).toHaveBeenCalledWith("new-workout", [{ code: "MB3", sets: 1, reps: 5, load: "", phase: "main" }]);
  });
  it("rolls back its empty header if the first planned row fails", async () => {
    mocks.plan.mockRejectedValue(new Error("plan failed"));
    await expect(createSpontaneousWorkout("location", "Spontanpass", exercise)).rejects.toThrow("plan failed");
    expect(mocks.rollback).toHaveBeenCalledWith("id", "new-workout");
  });
  it("preserves the existing empty spontaneous start", async () => {
    await createSpontaneousWorkout("location", "Spontanpass");
    expect(mocks.plan).not.toHaveBeenCalled();
  });
});