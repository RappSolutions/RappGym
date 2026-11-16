import { expect, it } from "vitest";
import { emptyTrainingProfile, profileForAI, trainingProfileSchema } from "@/lib/training-profile";

it("keeps every profile field optional", () => {
  expect(trainingProfileSchema.parse(emptyTrainingProfile)).toEqual({ birth_year: null, height_cm: null, weight_kg: null, experience: "", preferences: "", limitations: "", pace: "" });
});
it("always includes the saved profile in AI requests", () => {
  const profile = { birth_year: 1976, height_cm: 180, weight_kg: 80, experience: "Beginner", preferences: "Light", limitations: "Avoid jumping", pace: "intense" as const };
  expect(profileForAI({ ...profile, use_for_ai: false } as never, "2026-11-16")).toEqual({ ...profile, approximate_age: 50 });
  expect(profileForAI(null, "2026-11-16")).toBeNull();
});
it("recalculates approximate age from birth year each year", () => {
  const profile = { ...emptyTrainingProfile, birth_year: 1976 };
  expect(profileForAI(profile, "2026-11-16")?.approximate_age).toBe(50);
  expect(profileForAI(profile, "2027-11-16")?.approximate_age).toBe(51);
});
