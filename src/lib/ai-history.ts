import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trainingInsightsSchema } from "@/lib/training-insights-schema";
import { trainingRequestSchema } from "@/lib/training-request";

export const aiHistoryQuery = queryOptions({
  queryKey: ["ai-history"],
  queryFn: async () => {
    const { data, error } = await supabase.from("training_ai_history").select("*").order("generated_at", { ascending: false });
    if (error) throw error;
    return data.map((row) => ({ id: row.id, generatedAt: row.generated_at, language: row.language, gymId: row.gym_id, today: row.today,
      request: trainingRequestSchema.parse(row.request), question: trainingRequestSchema.parse(row.request).question, insights: trainingInsightsSchema.parse(row.insights), inputTokens: row.input_tokens, outputTokens: row.output_tokens }));
  },
});

export const acceptedAiQuery = queryOptions({
  queryKey: ["accepted-ai-workouts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("workouts").select("ai_history_id,ai_workout_key").not("ai_history_id", "is", null);
    if (error) throw error;
    return data;
  },
});

export function unacceptedWorkoutKeys(keys: string[], accepted: ReadonlySet<string>) {
  return keys.filter((key) => !accepted.has(key));
}