import { z } from "zod";

const suggestionSchema = z.object({
  code: z.string(), phase: z.enum(["intro", "main", "outro"]), sets: z.number(), reps: z.number(), load: z.string(), reason: z.string(),
}).strict();

export const trainingInsightsSchema = z.object({
  summary: z.string(),
  weightDevelopment: z.string(),
  setDevelopment: z.string(),
  recommendation: z.string(),
  exercises: z.array(suggestionSchema),
  answer: z.string(),
  workouts: z.array(z.object({
    title: z.string(), dayOffset: z.number(), focus: z.string(), exercises: z.array(suggestionSchema),
  }).strict()),
  goalNotes: z.string(),
  caution: z.string(),
}).strict();

export type TrainingInsights = z.infer<typeof trainingInsightsSchema>;

/** Stored history predates phases (and briefly had free-text warmup/cooldown); default rows to main and drop the retired fields. */
export function parseStoredInsights(value: unknown): TrainingInsights {
  const raw = (value ?? {}) as { exercises?: unknown; workouts?: unknown };
  const ex = (items: unknown) => Array.isArray(items) ? items.map((i) => ({ phase: "main", ...(i as object) })) : items;
  const workouts = Array.isArray(raw.workouts) ? raw.workouts.map((w) => { const { warmup: _w, cooldown: _c, ...rest } = w as Record<string, unknown>; return { ...rest, exercises: ex(rest["exercises"]) }; }) : raw.workouts;
  return trainingInsightsSchema.parse({ ...(raw as object), exercises: ex(raw.exercises), workouts });
}
