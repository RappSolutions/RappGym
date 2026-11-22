import { z } from "zod";
import type { Phase, Step } from "./circuit";

const pauseSchema = z.object({ phase: z.enum(["intro", "main", "outro"]), lap: z.number().int().positive(), endedAt: z.number().finite(), minutes: z.number().nonnegative().nullable() });
const schema = z.object({
  cursor: z.string().nullable(), fromIdx: z.number().int(), skipped: z.array(z.string()),
  lapStartedAt: z.number().finite().nullable(), lapKey: z.string().nullable(),
  durations: z.array(z.number().nonnegative()), pause: pauseSchema.nullable(),
  loads: z.array(z.tuple([z.string(), z.string()])), reps: z.array(z.tuple([z.string(), z.number().nonnegative()])),
});
export type RunnerState = z.infer<typeof schema>;
export const emptyRunnerState = (): RunnerState => ({ cursor: null, fromIdx: -1, skipped: [], lapStartedAt: null, lapKey: null, durations: [], pause: null, loads: [], reps: [] });
export function parseRunnerState(raw: string | null): RunnerState {
  try { const result = schema.safeParse(JSON.parse(raw ?? "null")); return result.success ? result.data : emptyRunnerState(); }
  catch { return emptyRunnerState(); }
}
export function lapMinutes(start: number | null, end: number): number | null {
  return start !== null && end >= start ? (end - start) / 60000 : null;
}
/** Only extrapolate comparable remaining laps in the same phase; add one minute of rest per upcoming lap. */
export function remainingLapMinutes(durations: readonly number[], remainingLaps: number, spontaneous: boolean): number | null {
  if (spontaneous || !durations.length || remainingLaps <= 0) return null;
  return Math.round((durations.reduce((n, d) => n + d, 0) / durations.length + 1) * remainingLaps);
}
export function logSectionHeaders<T extends { phase: string; lap: number | null; code?: string; sets?: number | null; created_at?: string }>(entries: readonly T[], circuit = false): ( { phase: Phase | null; lap: number | null; estimated?: boolean } | null)[] {
  const multiPhase = new Set(entries.map((e) => e.phase)).size > 1;
  const inferred = new Map<T, number>();
  // Display-only fallback for individual circuit sets, never aggregated imports or station work.
  if (circuit) for (const phase of new Set(entries.map((e) => e.phase))) {
    const rows = entries.filter((e) => e.phase === phase);
    if (rows.some((e) => e.lap !== null || !e.code || (e.sets ?? 1) !== 1) || new Set(rows.map((e) => e.code)).size < 2 || new Set(rows.map((e) => e.created_at)).size < 2) continue;
    let lap = 1;
    const seen = new Set<string>();
    for (const e of rows) {
      if (!e.code) continue;
      if (seen.has(e.code)) { lap++; seen.clear(); }
      seen.add(e.code);
      inferred.set(e, lap);
    }
  }
  const lapOf = (e: T) => e.lap ?? inferred.get(e) ?? null;
  return entries.map((e, i) => {
    const prev = entries[i - 1];
    const multiLap = new Set(entries.filter((r) => r.phase === e.phase).map(lapOf).filter((l) => l !== null)).size > 1;
    const lap = lapOf(e);
    if ((!multiPhase && !multiLap) || (prev?.phase === e.phase && lapOf(prev) === lap)) return null;
    return { phase: multiPhase ? (e.phase as Phase) : null, lap: multiLap ? lap : null, ...(multiLap && inferred.has(e) ? { estimated: true } : {}) };
  });
}

/** Explicit ordinals preserve holes caused by skipping; legacy rows use sequential allocation for display only. */
export function completedStepKeys<T extends { id: string; exercise_id: string; code: string }>(steps: readonly Step<T>[], entries: readonly { exercise_id: string | null; code: string; phase: string; set_number: number | null; sets: number | null }[]): Set<string> {
  const keys = new Set<string>();
  const key = (s: Step<T>) => `${s.row.id}:${s.set}`;
  for (const e of entries.filter((e) => e.set_number !== null)) {
    const s = steps.find((s) => s.row.exercise_id === e.exercise_id && s.phase === e.phase && s.set === e.set_number && !keys.has(key(s)));
    if (s) keys.add(key(s));
  }
  for (const e of entries.filter((e) => e.set_number === null)) {
    for (let n = 0; n < Math.max(1, e.sets ?? 1); n++) {
      const s = steps.find((s) => s.row.code === e.code && s.phase === e.phase && !keys.has(key(s)));
      if (s) keys.add(key(s));
    }
  }
  return keys;
}