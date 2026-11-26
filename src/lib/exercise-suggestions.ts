import { z } from "zod";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const exerciseSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category_id: z.string().uuid().nullable(),
  equipment_id: z.string().uuid().nullable(),
  instructions: z.string().trim().min(1).max(4000),
  source_url: z.union([z.literal(""), z.string().url().max(2000).refine((url) => /^https?:\/\//i.test(url))]),
});
export type ExerciseSuggestion = z.infer<typeof exerciseSuggestionSchema>;
export const emptyExerciseSuggestion: ExerciseSuggestion = { name: "", category_id: null, equipment_id: null, instructions: "", source_url: "" };

export const suggestionLookupsQuery = queryOptions({
  queryKey: ["exercise-suggestion-lookups"],
  queryFn: async () => {
    const [categories, equipment] = await Promise.all([
      supabase.from("exercise_categories").select("id,name,translations").order("sort_order").order("name"),
      supabase.from("exercise_equipment").select("id,name,translations").order("name"),
    ]);
    if (categories.error) throw categories.error;
    if (equipment.error) throw equipment.error;
    return { categories: categories.data, equipment: equipment.data };
  },
});