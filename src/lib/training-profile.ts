import { z } from "zod";

export const trainingProfileSchema = z.object({
  age: z.number().int().min(1).max(120).nullable(),
  height_cm: z.number().min(30).max(300).nullable(),
  weight_kg: z.number().min(1).max(500).nullable(),
  experience: z.string().trim().max(1000),
  preferences: z.string().trim().max(2000),
  limitations: z.string().trim().max(2000),
  use_for_ai: z.boolean(),
});
export type TrainingProfile = z.infer<typeof trainingProfileSchema>;
export const emptyTrainingProfile: TrainingProfile = { age: null, height_cm: null, weight_kg: null, experience: "", preferences: "", limitations: "", use_for_ai: false };

export function profileForAI(profile: TrainingProfile | null) {
  if (!profile?.use_for_ai) return null;
  const { use_for_ai: _, ...fields } = trainingProfileSchema.parse(profile);
  return fields;
}