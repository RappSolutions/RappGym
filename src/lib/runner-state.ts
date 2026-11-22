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
export function logSectionHeaders<T extends { phase: string; lap: number | null }>(entries: readonly T[]): ( { phase: Phase | null; lap: number | null } | null)[] {
  const multiPhase = new Set(entries.map((e) => e.phase)).size > 1;
  return entries.map((e, i) => {
    const prev = entries[i - 1];
    const multiLap = new Set(entries.filter((r) => r.phase === e.phase).map((r) => r.lap).filter((l) => l !== null)).size > 1;
    if ((!multiPhase && !multiLap) || (prev?.phase === e.phase && prev.lap === e.lap)) return null;
    return { phase: multiPhase ? (e.phase as Phase) : null, lap: multiLap ? e.lap : null };
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