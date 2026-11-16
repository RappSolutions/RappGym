import { expect, it } from "vitest";
import { emptyTrainingProfile, profileForAI, trainingProfileSchema } from "@/lib/training-profile";

it("keeps every profile field optional and sharing off by default", () => {
  expect(trainingProfileSchema.parse(emptyTrainingProfile)).toEqual({ birth_year: null, height_cm: null, weight_kg: null, experience: "", preferences: "", limitations: "", use_for_ai: false });
});
it("never sends profile details to AI without consent", () => {
  expect(profileForAI({ ...emptyTrainingProfile, birth_year: 1976, preferences: "Light workouts", limitations: "Avoid jumping" }, "2026-11-16")).toBeNull();
  expect(profileForAI(null, "2026-11-16")).toBeNull();
});
it("includes the consented background but no identity or permission fields", () => {
  const profile = { birth_year: 1976, height_cm: 180, weight_kg: 80, experience: "Beginner", preferences: "Light workouts", limitations: "Avoid jumping", use_for_ai: true };
  expect(profileForAI(profile, "2026-11-16")).toEqual({ birth_year: 1976, height_cm: 180, weight_kg: 80, experience: "Beginner", preferences: "Light workouts", limitations: "Avoid jumping", approximate_age: 50 });
});
it("recalculates approximate age from birth year each year", () => {
  const profile = { ...emptyTrainingProfile, birth_year: 1976, use_for_ai: true };
  expect(profileForAI(profile, "2026-11-16")?.approximate_age).toBe(50);
  expect(profileForAI(profile, "2027-11-16")?.approximate_age).toBe(51);
});
