import type { Exercise, LogEntry } from "@/lib/gym";
import { repsUnit } from "@/lib/reps-unit";
import { completedEntries } from "@/lib/workout-suggestions";

/** Display facts with their recorded unit; never reinterpret an old value using today's exercise unit. */
export function formatExerciseResult(entry: Pick<LogEntry, "load" | "reps" | "reps_unit">, unitLabel: (unit: "sec" | "min") => string): string {
  const unit = repsUnit(entry);
  const quantity = entry.reps === null ? "" : `${entry.reps}${unit === "reps" ? "" : ` ${unitLabel(unit)}`}`;
  const load = entry.load.trim();
  return [quantity, load].filter(Boolean).join(" @ ");
}

/** Exercise identity is the FK; the code fallback is for imported legacy rows only. */
export function exerciseHistory(log: LogEntry[], exercise: Pick<Exercise, "id" | "code">): LogEntry[] {
  return completedEntries(log).filter((entry) => entry.exercise_id ? entry.exercise_id === exercise.id : entry.code === exercise.code);
}