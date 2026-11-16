import { describe, expect, it } from "vitest";
import { normalizeTrainingPlan, planStartDate, plannedWorkoutDate, trainingRequestSchema, trainingResultSections } from "@/lib/training-request";
import type { TrainingInsights } from "@/lib/training-insights-schema";

const suggestion = { code: "DB-EX", sets: 2, reps: 12, load: "15", reason: "" };
const insights = { summary: "", weightDevelopment: "", setDevelopment: "", recommendation: "", answer: "", exercises: [suggestion], goalNotes: "", caution: "", workouts: [0, 2, 4, 6].map((dayOffset) => ({ title: "", focus: "", dayOffset, exercises: [suggestion] })) } satisfies TrainingInsights;
const request = trainingRequestSchema.parse({ mode: "plan", workoutCount: 4, periodDays: 7, question: "Ge mig fyra nya pass med bra blandning under 7 dagar", purpose: "Skidåkning" });

describe("Personal training requests", () => {
  it("analysis results do not include next-workout proposals", () => {
    expect(trainingResultSections("summary")).toEqual({ analysis: true, plan: false });
  });
  it("workout planning results do not include completed-training analysis", () => {
    expect(trainingResultSections("plan")).toEqual({ analysis: false, plan: true });
  });
  it("carries the four-workout seven-day request and purpose unchanged", () => {
    expect(request).toMatchObject({ workoutCount: 4, periodDays: 7, question: "Ge mig fyra nya pass med bra blandning under 7 dagar", purpose: "Skidåkning" });
    expect(normalizeTrainingPlan(insights, request, ["DB-EX"]).workouts).toHaveLength(4);
  });
  it("rejects a plan that does not contain the requested four workouts", () => {
    expect(() => normalizeTrainingPlan({ ...insights, workouts: insights.workouts.slice(0, 3) }, request, ["DB-EX"])).toThrow("invalid-plan");
  });
  it("keeps the last workout inside the seven-day period", () => {
    expect(() => normalizeTrainingPlan({ ...insights, workouts: insights.workouts.map((workout, index) => index === 3 ? { ...workout, dayOffset: 7 } : workout) }, request, ["DB-EX"])).toThrow("invalid-plan");
  });
  it("only includes exercises supplied by the database", () => {
    const extra = { ...suggestion, code: "invented" };
    const output = normalizeTrainingPlan({ ...insights, workouts: insights.workouts.map((workout) => ({ ...workout, exercises: [extra, suggestion] })) }, request, ["DB-EX"]);
    expect(output.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.code))).toEqual(["DB-EX", "DB-EX", "DB-EX", "DB-EX"]);
  });
  it("starts the plan on the chosen start date", () => {
    const r = trainingRequestSchema.parse({ mode: "plan", startDate: "2026-12-01" });
    expect(plannedWorkoutDate(planStartDate(r, "2026-11-16"), 2)).toBe("2026-12-03");
    expect(planStartDate(trainingRequestSchema.parse({ mode: "plan" }), "2026-11-16")).toBe("2026-11-16");
  });
  it("formats workout dates as ISO 8601 across year boundaries", () => {
    expect(plannedWorkoutDate("2026-12-30", 6)).toBe("2027-01-05");
  });
  it("retains summary requests without creating a multi-workout plan", () => {
    expect(normalizeTrainingPlan(insights, trainingRequestSchema.parse({}), ["DB-EX"]).workouts).toEqual([]);
  });
  it("plans workouts without a free-text question", () => {
    const bare = trainingRequestSchema.parse({ mode: "plan" });
    expect(bare).toMatchObject({ mode: "plan", question: "", workoutCount: null, periodDays: null });
    expect(normalizeTrainingPlan(insights, bare, ["DB-EX"]).workouts).toHaveLength(4);
  });
});