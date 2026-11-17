import type { TrainingInsights } from "@/lib/training-insights-schema";
import { plannedWorkoutDate } from "@/lib/training-request";
import { appendLoadAdvice, splitSuggestedLoad } from "@/lib/suggested-load";

export function completedEntries<T extends { status?: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.status !== "suggested");
}

/** Removing a proposal must never remove its already completed exercises. */
export function removableSuggestionIds(rows: readonly { id: string; status: string; workout_id: string | null }[], workoutId: string): string[] {
  return rows.filter((row) => row.status === "suggested" && (row.workout_id ?? row.id) === workoutId).map((row) => row.id);
}

export function suggestionRows(items: TrainingInsights["exercises"], today: string, dayOffset: number, gymId: string | null, workoutId: string) {
  return items.map((item, index) => {
    const split = splitSuggestedLoad(item.load);
    return {
    code: item.code, sets: item.sets, reps: item.reps, load: split.load,
    date: plannedWorkoutDate(today, dayOffset), note: appendLoadAdvice(item.reason, split.advice) || null,
    gym_id: gymId, status: "suggested" as const, workout_id: workoutId, proposal_order: index,
  }; });
}

/** Local calendar date and 24-hour clock, independent of UI language. */
export function analysisDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}