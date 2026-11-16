import type { TrainingInsights } from "@/lib/training-insights-schema";
import { plannedWorkoutDate } from "@/lib/training-request";

export function completedEntries<T extends { status?: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.status !== "suggested");
}

export function suggestionRows(items: TrainingInsights["exercises"], today: string, dayOffset: number, title: string, gymId: string | null, proposalId: string) {
  return items.map((item, index) => ({
    code: item.code, sets: item.sets, reps: item.reps, load: item.load,
    date: plannedWorkoutDate(today, dayOffset), note: item.reason || null,
    gym_id: gymId, status: "suggested" as const, proposal_id: proposalId,
    proposal_title: title, proposal_order: index,
  }));
}

/** Local calendar date and 24-hour clock, independent of UI language. */
export function analysisDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}