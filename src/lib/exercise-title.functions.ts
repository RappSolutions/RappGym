import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exerciseNameUrl } from "./exercise-title";
import { fetchExerciseDetails } from "./exercise-title.server";

export const resolveExerciseTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().max(2000).refine((value) => !!exerciseNameUrl(value)) }))
  .handler(async ({ data }) => fetchExerciseDetails(data.url));