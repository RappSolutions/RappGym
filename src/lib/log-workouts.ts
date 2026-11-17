/** Completed log grouped per workout; rows without a workout form one "single exercises" group per date. Newest first. */
export function groupLogByWorkout<T extends { id: string; date: string; created_at: string; workout_id: string | null }>(log: readonly T[]) {
  const groups = new Map<string, { key: string; workoutId: string | null; date: string; last: string; entries: T[] }>();
  for (const row of log) {
    const key = row.workout_id ?? `day:${row.date}`;
    const g = groups.get(key) ?? { key, workoutId: row.workout_id, date: row.date, last: row.created_at, entries: [] };
    g.entries.push(row);
    if (row.date > g.date) g.date = row.date;
    if (row.created_at > g.last) g.last = row.created_at;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.last.localeCompare(a.last));
}

/** Plan a completed workout again: one row per exercise in performed order, sets = sets actually done, latest reps/load. */
export function replanRows<T extends { code: string; sets: number | null; reps: number | null; load: string; created_at: string }>(entries: readonly T[]) {
  const ordered = [...entries].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const byCode = new Map<string, { code: string; sets: number; reps: number | null; load: string }>();
  for (const e of ordered) {
    const cur = byCode.get(e.code);
    const sets = Math.max(1, e.sets ?? 1);
    if (cur) Object.assign(cur, { sets: cur.sets + sets, reps: e.reps, load: e.load });
    else byCode.set(e.code, { code: e.code, sets, reps: e.reps, load: e.load });
  }
  return [...byCode.values()];
}
