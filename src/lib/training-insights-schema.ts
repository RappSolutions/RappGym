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
    title: z.string(), dayOffset: z.number(), focus: z.string(), exercises: z.array(suggestionSchema),
  }).strict()),
  goalNotes: z.string(),
  caution: z.string(),
}).strict();

export type TrainingInsights = z.infer<typeof trainingInsightsSchema>;