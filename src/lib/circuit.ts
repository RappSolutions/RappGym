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
