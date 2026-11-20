import type { Exercise, LogEntry } from "@/lib/gym";
import { progressByDay } from "@/lib/progress";
import { completedEntries } from "@/lib/workout-suggestions";

export function trainingContext(log: LogEntry[], exercises: Exercise[], gymId: string | null) {
  log = completedEntries(log);
  const dates = [...new Set(log.map((row) => row.date))].sort();
  const recentDates = new Set(dates.slice(-10));
  const groups = new Map<string, LogEntry[]>();
  for (const row of log) {
    const key = `${row.gym_id ?? "global"}:${row.code}`;
    const entries = groups.get(key) ?? [];
    entries.push(row);
    groups.set(key, entries);
  }
  return {
    totalSets: log.reduce((sum, row) => sum + Math.max(1, row.sets ?? 1), 0),
    workoutCount: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    setsByDate: progressByDay(log).map(({ date, sets }) => ({ date, sets })),
    // Constant-size per exercise and gym regardless of history length: only the latest numeric kg load.
    lastLoads: [...groups.values()].flatMap((rows) => {
      const last = progressByDay(rows).filter((day) => day.weight !== null).at(-1);
      return last ? [{ code: rows[0]?.code, gymId: rows[0]?.gym_id ?? null, kg: last.weight, date: last.date }] : [];
    }),
    recentLogs: log.filter((row) => recentDates.has(row.date)).map(({ code, date, gym_id, load, sets, reps }) => ({ code, date, gymId: gym_id, load, sets, reps })),
    exercises: exercises.map(({ code, name, category, equipment, translations }) => ({ code, name, category, equipment, translations })),
    nextWorkoutGymId: gymId,
    availableExerciseCodes: exercises.filter((exercise) => exercise.is_active !== false).map((exercise) => exercise.code),
  };
}