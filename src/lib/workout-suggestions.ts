import type { TrainingInsights } from "@/lib/training-insights-schema";
import { appendLoadAdvice, splitSuggestedLoad } from "@/lib/suggested-load";

export function completedEntries<T extends { status?: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.status !== "suggested");
}

/** Removing a proposal must never remove its already completed exercises. */
export function removableSuggestionIds(rows: readonly { id: string; status: string; workout_id: string | null }[], workoutId: string): string[] {
  return rows.filter((row) => row.status === "suggested" && (row.workout_id ?? row.id) === workoutId).map((row) => row.id);
}

/** AI exercises as plan items; explicit kg loads are split from advice text. */
export function suggestionRows(items: TrainingInsights["exercises"]) {
  return items.map((item) => {
    const split = splitSuggestedLoad(item.load);
    return { code: item.code, sets: item.sets, reps: item.reps, load: split.load, note: appendLoadAdvice(item.reason, split.advice) || null, phase: item.phase };
  });
}

/** Local calendar date and 24-hour clock, independent of UI language. */
export function analysisDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}