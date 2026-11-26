export const PHASES = ["intro", "main", "outro"] as const;
export type Phase = (typeof PHASES)[number];
export type Step<T> = { lap: number; set: number; phase: Phase; row: T };
const phaseOf = (r: { phase?: string | null }): Phase => (PHASES as readonly string[]).includes(r.phase ?? "") ? (r.phase as Phase) : "main";

/** Lap (1-based) for set i (0-based) of S sets spread evenly over L laps: 1 + floor(i*L/S). */
export function spreadLap(i: number, sets: number, laps: number): number { return 1 + Math.floor((i * laps) / sets); }

/** Circuit order within one block: laps = max sets; an exercise with fewer sets is spread evenly over the laps instead of front-loaded. */
export function circuitSteps<T extends { id: string; sets: number; phase?: string | null }>(rows: readonly T[]): Step<T>[] {
  const laps = Math.max(0, ...rows.map((r) => Math.max(1, r.sets)));
  const steps: Step<T>[] = [];
  for (let lap = 1; lap <= laps; lap++) for (const row of rows) {
    const n = Math.max(1, row.sets);
    for (let i = 0; i < n; i++) if (spreadLap(i, n, laps) === lap) steps.push({ lap, set: i + 1, phase: phaseOf(row), row });
  }
  return steps;
}

/** Whole workout: intro, main, outro run in that order, each phase as its own circuit or station block. */
export function workoutSteps<T extends { id: string; sets: number; phase?: string | null }>(rows: readonly T[], circuit: boolean): Step<T>[] {
  return PHASES.flatMap((ph) => { const part = rows.filter((r) => phaseOf(r) === ph); return circuit ? circuitSteps(part) : stationSteps(part); });
}

/** Rows grouped by phase in phase order, empty phases omitted. */
export function groupByPhase<T extends { phase?: string | null }>(rows: readonly T[]): { phase: Phase; rows: T[] }[] {
  return PHASES.map((phase) => ({ phase, rows: rows.filter((r) => phaseOf(r) === phase) })).filter((g) => g.rows.length > 0);
}

/** Adjust a kg load by a step; text loads stay untouched, never below zero. */
export function adjustLoad(load: string, delta: number): string {
  const n = Number(load.replace(",", "."));
  if (load.trim() === "" ) return delta > 0 ? String(delta) : "";
  if (!Number.isFinite(n)) return load;
  return String(Math.max(0, Math.round((n + delta) * 100) / 100));
}

/** Spontaneous workouts do not expose phase selection; every added exercise belongs to main. */
export function newExercisePhase(spontaneous: boolean, selected: Phase): Phase {
  return spontaneous ? "main" : selected;
}

/** Planned sets for a newly added exercise: spontaneous workouts always start at 1 set per exercise; otherwise circuit mode uses the lap count and station mode 3. */
export function defaultPlannedSets(opts: { spontaneous: boolean; circuit: boolean; laps: number; phase?: Phase }): number {
  if (opts.spontaneous || (opts.phase !== undefined && opts.phase !== "main")) return 1;
  return opts.circuit ? Math.max(1, opts.laps) : 3;
}

/** Station order: all sets of one exercise before moving to the next. */
export function stationSteps<T extends { id: string; sets: number; phase?: string | null }>(rows: readonly T[]): Step<T>[] {
  return rows.flatMap((row) => Array.from({ length: Math.max(1, row.sets) }, (_, k) => ({ lap: k + 1, set: k + 1, phase: phaseOf(row), row })));
}

/** Steps still to do: drop the first N sets of each exercise where N = sets already completed for it in this workout. */
export function remainingSteps<T extends { row: { code: string }; set: number }>(steps: readonly T[], doneByCode: ReadonlyMap<string, number>): T[] {
  return steps.filter((s) => s.set > (doneByCode.get(s.row.code) ?? 0));
}

/** Done vs planned sets for one planned workout: completed rows' sets against the suggested rows' planned sets. */
export function workoutSetProgress(workoutId: string, rows: readonly { sets: number | null }[], log: readonly { workout_id: string | null; status: string; sets: number | null }[]): { done: number; total: number } {
  const total = rows.reduce((n, r) => n + Math.max(1, r.sets ?? 1), 0);
  const done = log.filter((e) => e.workout_id === workoutId && e.status === "completed").reduce((n, e) => n + Math.max(1, e.sets ?? 1), 0);
  return { done: Math.min(done, total), total };
}

/** A planned workout is finished once every planned set has been logged. */
export function isWorkoutFinished(done: number, total: number): boolean { return total > 0 && done >= total; }
