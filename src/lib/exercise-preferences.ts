import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** AI priority per exercise. 3 (normal) is never stored; 1 is a hard filter, 5 is mandatory when it fits. */
export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];
export const DEFAULT_RATING: Rating = 3;
export const NEVER: Rating = 1;

export type RatingMap = Map<string, Rating>;

export function ratingOf(ratings: RatingMap, exerciseId: string): Rating {
  return ratings.get(exerciseId) ?? DEFAULT_RATING;
}

/** Split the usable exercises into what AI may see and the priority lists it must honour. */
export function aiExercisePool<T extends { id: string; code: string }>(usable: T[], ratings: RatingMap) {
  const pool = usable.filter((e) => ratingOf(ratings, e.id) !== NEVER);
  const by = (r: Rating) => pool.filter((e) => ratingOf(ratings, e.id) === r).map((e) => e.code);
  return { pool, priorities: { always: by(5), often: by(4), rarely: by(2) } };
}

export function ratingMap(rows: { exercise_id: string; rating: number }[]): RatingMap {
  return new Map(rows.filter((r) => r.rating >= 1 && r.rating <= 5).map((r) => [r.exercise_id, r.rating as Rating]));
}

export const exercisePreferencesQuery = queryOptions({
  queryKey: ["exercise-preferences"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_exercise_preferences").select("exercise_id, rating");
    if (error) throw new Error(error.message);
    return ratingMap(data);
  },
});

export async function saveRating(exerciseId: string, rating: Rating) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("not-signed-in");
  const q = supabase.from("user_exercise_preferences");
  const { error } = rating === DEFAULT_RATING
    ? await q.delete().eq("user_id", userId).eq("exercise_id", exerciseId)
    : await q.upsert({ user_id: userId, exercise_id: exerciseId, rating, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
