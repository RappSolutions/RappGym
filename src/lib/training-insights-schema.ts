import { z } from "zod";

const suggestionSchema = z.object({
  code: z.string(), sets: z.number(), reps: z.number(), load: z.string(), reason: z.string(),
}).strict();

export const trainingInsightsSchema = z.object({
  summary: z.string(),
  weightDevelopment: z.string(),
  setDevelopment: z.string(),
  recommendation: z.string(),
  exercises: z.array(suggestionSchema),
  answer: z.string(),
  workouts: z.array(z.object({
    title: z.string(), dayOffset: z.number(), focus: z.string(), warmup: z.string(), cooldown: z.string(), exercises: z.array(suggestionSchema),
  }).strict()),
  goalNotes: z.string(),
  caution: z.string(),
}).strict();

export type TrainingInsights = z.infer<typeof trainingInsightsSchema>;

/** Stored history predates warmup/cooldown; fill them so old answers still parse. */
export function parseStoredInsights(value: unknown): TrainingInsights {
  const raw = (value ?? {}) as { workouts?: unknown };
  const workouts = Array.isArray(raw.workouts) ? raw.workouts.map((w) => ({ warmup: "", cooldown: "", ...(w as object) })) : raw.workouts;
  return trainingInsightsSchema.parse({ ...(raw as object), workouts });
}
