import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExerciseLocation = { exercise_id: string; gym_id: string };

export const exerciseLocationsQuery = queryOptions({
  queryKey: ["exercise-locations"],
  queryFn: async () => {
    const all: ExerciseLocation[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("exercise_locations").select("exercise_id,gym_id").range(from, from + 999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) break;
    }
    return all;
  },
});

/** Exercises available at a location; no location means every exercise. */
export function exercisesAtLocation<T extends { id: string }>(exercises: T[], links: ExerciseLocation[], gymId: string | null): T[] {
  if (!gymId) return exercises;
  const ids = new Set(links.filter((l) => l.gym_id === gymId).map((l) => l.exercise_id));
  return exercises.filter((e) => ids.has(e.id));
}

/** Links to add so that every listed exercise is at the location (skips existing ones). */
export function missingLinks(exerciseIds: string[], links: ExerciseLocation[], gymId: string): ExerciseLocation[] {
  const have = new Set(links.filter((l) => l.gym_id === gymId).map((l) => l.exercise_id));
  return exerciseIds.filter((id) => !have.has(id)).map((exercise_id) => ({ exercise_id, gym_id: gymId }));
}
