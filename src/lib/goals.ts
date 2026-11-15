import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Goal = Tables<"training_goals">;
export const goalsQuery = queryOptions({
  queryKey: ["training-goals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("training_goals").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return data;
  },
});
