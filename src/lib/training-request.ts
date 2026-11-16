import { z } from "zod";
import type { TrainingInsights } from "@/lib/training-insights-schema";

export const trainingRequestSchema = z.object({
  mode: z.enum(["summary", "plan"]).default("summary"),
  question: z.string().trim().max(2000).default(""),
  workoutCount: z.number().int().min(1).max(14).nullable().default(null),
  periodDays: z.number().int().min(1).max(90).nullable().default(null),
  sessionMinutes: z.number().int().min(5).max(240).nullable().default(null),
  purpose: z.string().trim().max(300).default(""),
}).strict().refine((data) => !data.workoutCount || !data.periodDays || data.workoutCount <= data.periodDays, {
  message: "workoutCount exceeds periodDays", path: ["workoutCount"],
});

export type TrainingRequest = z.infer<typeof trainingRequestSchema>;

export function trainingResultSections(mode: TrainingRequest["mode"]) {
  return { analysis: mode === "summary", plan: mode === "plan" };
}

export function normalizeTrainingPlan(insights: TrainingInsights, request: TrainingRequest, allowedCodes: string[]) {
  const allowed = new Set(allowedCodes);
  const clean = (items: TrainingInsights["exercises"]) => items.filter((item) => allowed.has(item.code)).slice(0, 5).map((item) => ({
    ...item, sets: Math.max(1, Math.min(5, Math.round(item.sets))), reps: Math.max(1, Math.min(30, Math.round(item.reps))),
  }));
  const workouts = request.mode === "plan" ? insights.workouts.slice(0, 14).map((workout) => ({
    ...workout, exercises: clean(workout.exercises),
  })).sort((a, b) => a.dayOffset - b.dayOffset) : [];
  if (workouts.some((workout) => !Number.isInteger(workout.dayOffset) || workout.dayOffset < 0 || workout.dayOffset >= (request.periodDays ?? 90))) throw new Error("invalid-plan");
  if (new Set(workouts.map((workout) => workout.dayOffset)).size !== workouts.length) throw new Error("invalid-plan");
  if (request.mode === "plan" && allowed.size && (!workouts.length || workouts.some((workout) => !workout.exercises.length) || (request.workoutCount !== null && workouts.length !== request.workoutCount))) throw new Error("invalid-plan");
  return { ...insights, exercises: clean(insights.exercises), workouts };
}

export function plannedWorkoutDate(today: string, dayOffset: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}