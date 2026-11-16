import { expect, it } from "vitest";
import { emptyTrainingProfile, profileForAI, trainingProfileSchema } from "@/lib/training-profile";

it("keeps every profile field optional and sharing off by default", () => {
  expect(trainingProfileSchema.parse(emptyTrainingProfile)).toEqual({ age: null, height_cm: null, weight_kg: null, experience: "", preferences: "", limitations: "", use_for_ai: false });
});
it("never sends profile details to AI without consent", () => {
  expect(profileForAI({ ...emptyTrainingProfile, age: 50, preferences: "Light workouts", limitations: "Avoid jumping" })).toBeNull();
  expect(profileForAI(null)).toBeNull();
});
it("includes the consented background but no identity or permission fields", () => {
  const profile = { age: 50, height_cm: 180, weight_kg: 80, experience: "Beginner", preferences: "Light workouts", limitations: "Avoid jumping", use_for_ai: true };
  expect(profileForAI(profile)).toEqual({ age: 50, height_cm: 180, weight_kg: 80, experience: "Beginner", preferences: "Light workouts", limitations: "Avoid jumping" });
});