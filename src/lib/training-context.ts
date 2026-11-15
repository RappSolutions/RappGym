import type { Exercise, LogEntry } from "@/lib/gym";
import { progressByDay } from "@/lib/progress";

export function trainingContext(log: LogEntry[], exercises: Exercise[], gymId: string | null) {
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
    weightsByExerciseAndGym: [...groups.values()].map((rows) => ({
      code: rows[0]?.code,
      gymId: rows[0]?.gym_id,
      days: progressByDay(rows).filter((day) => day.weight !== null).slice(-20),
    })),
    recentLogs: log.filter((row) => recentDates.has(row.date)).map(({ code, date, gym_id, load, sets, reps }) => ({ code, date, gymId: gym_id, load, sets, reps })),
    exercises: exercises.map(({ code, name, category, equipment, gym_id, translations }) => ({ code, name, category, equipment, gymId: gym_id, translations })),
    nextWorkoutGymId: gymId,
    availableExerciseCodes: exercises.filter((exercise) => !gymId || !exercise.gym_id || exercise.gym_id === gymId).map((exercise) => exercise.code),
  };
}