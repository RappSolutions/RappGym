/** Circuit order: every exercise once per lap, lap after lap; an exercise drops out once its set count is reached. */
export function circuitSteps<T extends { id: string; sets: number }>(rows: readonly T[]): { lap: number; row: T }[] {
  const laps = Math.max(0, ...rows.map((r) => Math.max(1, r.sets)));
  const steps: { lap: number; row: T }[] = [];
  for (let lap = 1; lap <= laps; lap++) for (const row of rows) if (lap <= Math.max(1, row.sets)) steps.push({ lap, row });
  return steps;
}

/** Adjust a kg load by a step; text loads stay untouched, never below zero. */
export function adjustLoad(load: string, delta: number): string {
  const n = Number(load.replace(",", "."));
  if (load.trim() === "" ) return delta > 0 ? String(delta) : "";
  if (!Number.isFinite(n)) return load;
  return String(Math.max(0, Math.round((n + delta) * 100) / 100));
}

/** Station order: all sets of one exercise before moving to the next. */
export function stationSteps<T extends { id: string; sets: number }>(rows: readonly T[]): { lap: number; row: T }[] {
  return rows.flatMap((row) => Array.from({ length: Math.max(1, row.sets) }, (_, k) => ({ lap: k + 1, row })));
}

/** Steps still to do: drop the first N laps of each exercise where N = sets already completed for it in this workout. */
export function remainingSteps<T extends { row: { code: string }; lap: number }>(steps: readonly T[], doneByCode: ReadonlyMap<string, number>): T[] {
  return steps.filter((s) => s.lap > (doneByCode.get(s.row.code) ?? 0));
}

/** Done vs planned sets for one planned workout: completed rows' sets against the suggested rows' planned sets. */
export function workoutSetProgress(workoutId: string, rows: readonly { sets: number | null }[], log: readonly { workout_id: string | null; status: string; sets: number | null }[]): { done: number; total: number } {
  const total = rows.reduce((n, r) => n + Math.max(1, r.sets ?? 1), 0);
  const done = log.filter((e) => e.workout_id === workoutId && e.status === "completed").reduce((n, e) => n + Math.max(1, e.sets ?? 1), 0);
  return { done: Math.min(done, total), total };
}

/** A planned workout is finished once every planned set has been logged. */
export function isWorkoutFinished(done: number, total: number): boolean { return total > 0 && done >= total; }
