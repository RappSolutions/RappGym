import { z } from "zod";

export const trainingInsightsSchema = z.object({
  summary: z.string(),
  weightDevelopment: z.string(),
  setDevelopment: z.string(),
  recommendation: z.string(),
  exercises: z.array(z.object({
    code: z.string(),
    sets: z.number(),
    reps: z.number(),
    load: z.string(),
    reason: z.string(),
  }).strict()),
  caution: z.string(),
}).strict();

export type TrainingInsights = z.infer<typeof trainingInsightsSchema>;