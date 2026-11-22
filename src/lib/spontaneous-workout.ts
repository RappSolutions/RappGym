import { supabase } from "@/integrations/supabase/client";
import { todayISO, type Exercise, type LogEntry } from "@/lib/gym";
import { defaultPlannedSets } from "@/lib/circuit";
import { insertPlannedExercises, type PlanItem } from "@/lib/workout-edit";
import { repsUnit } from "@/lib/reps-unit";

export function spontaneousFirstExercise(exercise: Exercise, last?: LogEntry): PlanItem {
  return { code: exercise.code, sets: defaultPlannedSets({ spontaneous: true, circuit: true, laps: 1 }), reps: last?.reps ?? (repsUnit(exercise) === "reps" ? 10 : 1), load: last?.load ?? "", phase: "main" };
}

/** One shared start path; a selected exercise creates a plan, never a completed log entry. */
export async function createSpontaneousWorkout(gymId: string, title: string, exercise?: Exercise, last?: LogEntry): Promise<string> {
  const { data, error } = await supabase.from("workouts").insert({ title, created_by: "user", scheduled_date: todayISO(), gym_id: gymId, is_circuit: true, is_spontaneous: true }).select("id").single();
  if (error) throw error;
  try {
    if (exercise) await insertPlannedExercises(data.id, [spontaneousFirstExercise(exercise, last)]);
  } catch (cause) {
    // Roll back only the empty header created by this operation if its first plan row failed.
    const { error: rollbackError } = await supabase.from("workouts").delete().eq("id", data.id);
    if (rollbackError) throw rollbackError;
    throw cause;
  }
  return data.id;
}