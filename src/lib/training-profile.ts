import { z } from "zod";

export const trainingProfileSchema = z.object({
  birth_year: z.number().int().min(1900).max(2200).nullable().refine((year) => year === null || year <= new Date().getFullYear()),
  height_cm: z.number().min(30).max(300).nullable(),
  weight_kg: z.number().min(1).max(500).nullable(),
  experience: z.string().trim().max(1000),
  preferences: z.string().trim().max(2000),
  limitations: z.string().trim().max(2000),
  use_for_ai: z.boolean(),
});
export type TrainingProfile = z.infer<typeof trainingProfileSchema>;
export const emptyTrainingProfile: TrainingProfile = { birth_year: null, height_cm: null, weight_kg: null, experience: "", preferences: "", limitations: "", use_for_ai: false };

export function profileForAI(profile: TrainingProfile | null, today: string) {
  if (!profile?.use_for_ai) return null;
  const { use_for_ai: _, ...fields } = trainingProfileSchema.parse(profile);
  return { ...fields, approximate_age: fields.birth_year === null ? null : Number(today.slice(0, 4)) - fields.birth_year };
}