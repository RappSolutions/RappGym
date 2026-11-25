import { weightKg } from "./progress";
import { isoWeek, rowTonnage } from "./tonnage";

/** Multi-sheet log report (pure). All values derived from completed log facts at export time; never stored. Weeks are ISO 8601 (Monday start). */
export type ReportRow = { sets?: number | null; date: string; created_at: string; code: string; exercise_id: string | null; exercise_name: string; gym_id: string | null; workout_id?: string | null; reps: number | null; load: string; reps_unit: string };
type Ex = { id: string; code: string; name: string; category: string; equipment: string };
type Gym = { id: string; name: string };
export type Cell = string | number;

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b ? r1((a / b) * 100) : 0);
const sets = (r: ReportRow) => Math.max(1, r.sets ?? 1);
const ton = (r: ReportRow) => rowTonnage({ sets: r.sets ?? 1, reps: r.reps, load: r.load, reps_unit: r.reps_unit });
const minutes = (rs: readonly ReportRow[]) => { const t = rs.map((r) => Date.parse(r.created_at)).filter(Number.isFinite); return t.length > 1 ? Math.round((Math.max(...t) - Math.min(...t)) / 60000) : 0; };
const avg = (ns: number[]) => (ns.length ? r1(ns.reduce((a, b) => a + b, 0) / ns.length) : "");
const group = <T,>(xs: readonly T[], key: (x: T) => string) => { const m = new Map<string, T[]>(); for (const x of xs) { const k = key(x); const a = m.get(k); if (a) a.push(x); else m.set(k, [x]); } return m; };
/** Monday = 1 … Sunday = 7 (ISO 8601). */
export const isoWeekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
/** Monday of the ISO week containing date. */
export function weekMonday(date: string) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - (isoWeekday(date) - 1)); return d.toISOString().slice(0, 10); }
const workoutKey = (r: ReportRow) => r.workout_id ?? `${r.date}|${r.gym_id ?? ""}`;

export function buildLogReport(log: readonly ReportRow[], exercises: readonly Ex[], gyms: readonly Gym[], weekdays: readonly string[], titles: ReadonlyMap<string, string> = new Map()) {
  const rows = [...log].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
  const ex = new Map(exercises.map((e) => [e.id, e]));
  const gym = (id: string | null) => (id ? gyms.find((g) => g.id === id)?.name ?? "" : "");
  const cat = (r: ReportRow) => (r.exercise_id ? ex.get(r.exercise_id)?.category ?? "" : "");
  const totalSets = rows.reduce((n, r) => n + sets(r), 0);
  const totalKg = rows.reduce((n, r) => n + ton(r), 0);

  const workouts: Cell[][] = [...group(rows, workoutKey)].map(([k, rs]) => {
    const f = rs[0]!; const kg = rs.reduce((n, r) => n + ton(r), 0); const min = minutes(rs);
    return [f.date, weekdays[isoWeekday(f.date) - 1] ?? "", isoWeek(f.date), gym(f.gym_id), (f.workout_id && titles.get(f.workout_id)) || "", rs.reduce((n, r) => n + sets(r), 0), new Set(rs.map((r) => r.code)).size, min || "", Math.round(kg), min ? r1(kg / min) : ""];
  });

  const perExercise: Cell[][] = [...group(rows, (r) => r.exercise_id ?? r.code)].map(([, rs]) => {
    const f = rs[0]!, l = rs[rs.length - 1]!; const e = f.exercise_id ? ex.get(f.exercise_id) : undefined;
    const kgs = rs.map((r) => ({ r, kg: weightKg(r.load) })).filter((x): x is { r: ReportRow; kg: number } => x.kg != null && x.kg > 0);
    const pb = kgs.reduce<{ r: ReportRow; kg: number } | null>((b, x) => (!b || x.kg > b.kg ? x : b), null);
    const first = kgs[0]?.kg, last = kgs[kgs.length - 1]?.kg;
    return [f.code, e?.name ?? f.exercise_name, e?.category ?? "", e?.equipment ?? "", f.date, l.date, new Set(rs.map((r) => r.date)).size, rs.reduce((n, r) => n + sets(r), 0), rs.reduce((n, r) => n + (r.reps_unit === "reps" ? (r.reps ?? 0) * sets(r) : 0), 0), pb?.kg ?? "", pb?.r.date ?? "", last ?? "", first != null && last != null ? r1(last - first) : "", Math.round(rs.reduce((n, r) => n + ton(r), 0))];
  }).sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));

  const weeks: Cell[][] = [...group(rows, (r) => isoWeek(r.date))].map(([w, rs]) => {
    const kg = rs.reduce((n, r) => n + ton(r), 0);
    return [w, weekMonday(rs[0]!.date), new Set(rs.map(workoutKey)).size, new Set(rs.map((r) => r.date)).size, rs.reduce((n, r) => n + sets(r), 0), Math.round(kg)];
  });

  const categories: Cell[][] = [...group(rows, cat)].map(([c, rs]) => {
    const s = rs.reduce((n, r) => n + sets(r), 0), kg = rs.reduce((n, r) => n + ton(r), 0);
    return [c, s, pct(s, totalSets), Math.round(kg), pct(kg, totalKg), s ? r1(kg / s) : 0];
  }).sort((a, b) => Number(b[1]) - Number(a[1]));

  const places: Cell[][] = [...group(rows, (r) => r.gym_id ?? "")].map(([id, rs]) => {
    const ws = [...group(rs, workoutKey).values()]; const mins = ws.map(minutes).filter((m) => m > 0);
    const top = [...group(rs, (r) => r.code)].sort((a, b) => b[1].length - a[1].length)[0];
    return [gym(id || null), ws.length, rs.reduce((n, r) => n + sets(r), 0), Math.round(rs.reduce((n, r) => n + ton(r), 0)), avg(mins), top ? `${top[0]} (${top[1].length})` : ""];
  }).sort((a, b) => Number(b[1]) - Number(a[1]));

  const weekdayRows: Cell[][] = weekdays.map((d, i) => { const rs = rows.filter((r) => isoWeekday(r.date) === i + 1); return [d, new Set(rs.map(workoutKey)).size, rs.reduce((n, r) => n + sets(r), 0), Math.round(rs.reduce((n, r) => n + ton(r), 0))]; });

  return { workouts, perExercise, weeks, categories, places, weekdayRows, totals: { sets: totalSets, kg: Math.round(totalKg) } };
}

export const REPORT_COLUMNS = {
  workouts: ["date", "weekday", "week", "location", "workout", "sets", "exercises", "minutes", "tonnage", "density"],
  perExercise: ["code", "exercise", "category", "equipment", "first", "last", "days", "sets", "reps", "pb", "pbDate", "latest", "delta", "tonnage"],
  weeks: ["week", "monday", "workouts", "days", "sets", "tonnage"],
  categories: ["category", "sets", "setsPct", "tonnage", "tonnagePct", "kgPerSet"],
  places: ["location", "workouts", "sets", "tonnage", "avgMinutes", "topExercise"],
  weekdayRows: ["weekday", "workouts", "sets", "tonnage"],
} as const;
