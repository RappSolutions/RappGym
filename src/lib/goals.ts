import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Goal = Tables<"training_goals">;
export const GOAL_STATUSES = ["active", "fulfilled", "partly", "postponed", "nevermind"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export const isGoalOpen = (g: Pick<Goal, "status">) => g.status === "active";

/** Sort by target date ascending (goals without date last), then by created date. */
export function sortGoals<T extends Pick<Goal, "target_date" | "created_at">>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => {
    if (a.target_date !== b.target_date) {
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return a.target_date < b.target_date ? -1 : 1;
    }
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

export const goalsQuery = queryOptions({
  queryKey: ["training-goals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("training_goals").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return data;
  },
});
