import { toLogEntry, type LogRow } from "@/lib/log-entry";
export { toLogEntry };
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { completedEntries } from "@/lib/workout-suggestions";
import { EXERCISE_SELECT, normalizeExercise, type ExerciseCategory, type ExerciseEquipment, type ExerciseRow } from "@/lib/exercise-refs";

export type Exercise = ExerciseRow;
export type Workout = Tables<"workouts">;
/** Log row with its optional workout header (title, circuit, origin). */
/** Log row with its optional workout header. `code` is the exercise's current code (for lookups);
 * `recorded_code` is the code stored on the row — frozen for completed rows, so history shows what was done. */
export type LogEntry = LogRow & { workout?: Pick<Workout, "id" | "title" | "created_by" | "is_circuit" | "scheduled_date" | "created_at"> | null };
const ENTRY_SELECT = "*, workout:workouts(id,title,created_by,is_circuit,scheduled_date,created_at), ex:exercises(code)";

export const exercisesQuery = queryOptions({
  queryKey: ["exercises"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select(EXERCISE_SELECT)
      .order("code_number");
    if (error) throw error;
    const rows = (data as unknown as Parameters<typeof normalizeExercise>[0][]).map(normalizeExercise);
    for (const r of rows) if (r.category) TOKEN_BY_CATEGORY.set(r.category, r.category_token);
    return rows;
  },
});

export const exerciseCategoriesQuery = queryOptions({
  queryKey: ["exercise-categories"],
  queryFn: async (): Promise<ExerciseCategory[]> => {
    const { data, error } = await supabase.from("exercise_categories").select("*").order("sort_order").order("name");
    if (error) throw error;
    for (const c of data) TOKEN_BY_CATEGORY.set(c.name, c.color_token);
    return data;
  },
});

export const exerciseEquipmentQuery = queryOptions({
  queryKey: ["exercise-equipment"],
  queryFn: async (): Promise<ExerciseEquipment[]> => {
    const { data, error } = await supabase.from("exercise_equipment").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const logQuery = queryOptions({
  queryKey: ["log"],
  queryFn: async () => {
    const all: LogEntry[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("log_entries")
        .select(ENTRY_SELECT)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      all.push(...(data as unknown as (LogEntry & { ex?: { code: string } | null })[]).map((r) => toLogEntry(r) as LogEntry));
      if (data.length < 1000) break;
    }
    return all;
  },
});

/** Planned exercise (workout_exercises) in the shape the planning UI uses; never a log fact. */
export type PlannedRow = {
  id: string; workout_id: string; exercise_id: string; code: string; status: "suggested";
  sets: number; reps: number | null; load: string; note: string | null; phase: string;
  proposal_order: number; date: string; gym_id: string | null; created_at: string;
  workout: Pick<Workout, "id" | "title" | "created_by" | "is_circuit" | "scheduled_date" | "created_at"> | null;
};
type PlanDbRow = Tables<"workout_exercises"> & { ex: { code: string } | null; workout: Pick<Workout, "id" | "title" | "created_by" | "is_circuit" | "scheduled_date" | "created_at" | "gym_id"> };
export function toPlannedRow(r: PlanDbRow): PlannedRow {
  const { gym_id, ...workout } = r.workout;
  return { id: r.id, workout_id: r.workout_id, exercise_id: r.exercise_id, code: r.ex?.code ?? "", status: "suggested", sets: r.target_sets, reps: r.target_reps, load: r.target_load, note: r.note, phase: r.phase, proposal_order: r.sort_order, date: workout.scheduled_date ?? workout.created_at.slice(0, 10), gym_id, created_at: r.created_at, workout };
}

/** Plans of workouts not yet finished, ordered by date then plan order. */
export const suggestionsQuery = queryOptions({
  queryKey: ["workout-suggestions"],
  queryFn: async () => {
    const all: PlannedRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("workout_exercises").select("*, ex:exercises(code), workout:workouts!inner(id,title,created_by,is_circuit,scheduled_date,created_at,gym_id,completed_at)").is("workout.completed_at", null).order("sort_order").range(from, from + 999);
      if (error) throw error;
      all.push(...(data as unknown as PlanDbRow[]).map(toPlannedRow));
      if (data.length < 1000) break;
    }
    return all.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export function useInvalidateGym() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["log"] });
    qc.invalidateQueries({ queryKey: ["workout-suggestions"] });
    qc.invalidateQueries({ queryKey: ["exercises"] });
    qc.invalidateQueries({ queryKey: ["exercise-categories"] });
    qc.invalidateQueries({ queryKey: ["exercise-equipment"] });
  };
}

/** Unique categories ordered by the category table's sort order (then first appearance). */
export function categoriesOf(exercises: Pick<Exercise, "category">[]): string[] {
  const sort = new Map<string, number>();
  exercises.forEach((e, i) => { if (!sort.has(e.category)) sort.set(e.category, ((e as Partial<Exercise>).category_sort ?? 9999) * 10000 + i); });
  return [...sort.keys()].sort((a, b) => sort.get(a)! - sort.get(b)!);
}

/** Latest log entry per exercise code (log must be sorted newest first). */
export function lastByCode(log: LogEntry[]): Map<string, LogEntry> {
  const m = new Map<string, LogEntry>();
  for (const e of completedEntries(log)) if (!m.has(e.code)) m.set(e.code, e);
  return m;
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function isWorkoutExpanded(date: string, today: string, overrides: Map<string, boolean>) {
  return overrides.get(date) ?? date === today;
}

/** Suggested workouts stay collapsed unless they are for today; a click overrides that. */
export function isProposalExpanded(date: string, today: string, overrides: Map<string, boolean>, key: string) {
  return overrides.get(key) ?? date === today;
}

/** Recording order within a workout; tied import timestamps retain their existing order. */
export function workoutRecordingOrder<T extends { created_at: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

const CAT_TOKENS = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7"];
/** Colour tokens loaded from exercise_categories.color_token; index fallback only before data arrives. */
const TOKEN_BY_CATEGORY = new Map<string, string>();
export function categoryToken(category: string, categories: string[]): string {
  const stored = TOKEN_BY_CATEGORY.get(category);
  if (stored) return stored;
  const i = categories.indexOf(category);
  return CAT_TOKENS[(i < 0 ? 0 : i) % CAT_TOKENS.length] ?? "cat-1";
}

/** ISO 8601 calendar date (YYYY-MM-DD) — the app shows dates this way everywhere. */
export function formatDate(iso: string) {
  return iso.slice(0, 10);
}

/** ISO 8601 date with the weekday appended, e.g. "2026-11-14 · lör". */
export function formatDateWithWeekday(iso: string, language: "sv" | "en" = "sv") {
  const weekday = new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString(language === "en" ? "en-GB" : "sv-SE", { weekday: "short" });
  return `${formatDate(iso)} · ${weekday}`;
}

export function computeStats(log: LogEntry[], exercises: Exercise[]) {
  log = completedEntries(log);
  const byCode = new Map(exercises.map((e) => [e.code, e]));
  // Each row holds `sets` identical sets (repeat count).
  const n = (e: LogEntry) => Math.max(1, e.sets ?? 1);
  const totalSets = log.reduce((s, e) => s + n(e), 0);
  const totalReps = log.reduce((s, e) => s + n(e) * (e.reps ?? 0), 0);
  const sessions = new Set(log.map((e) => e.date)).size;
  const last = log.reduce<string | null>((m, e) => (!m || e.date > m ? e.date : m), null);
  const perCat = new Map<string, number>();
  const perEq = new Map<string, number>();
  for (const e of log) {
    const ex = byCode.get(e.code);
    const c = ex?.category ?? "Okänd";
    const q = ex?.equipment || "Okänd";
    perCat.set(c, (perCat.get(c) ?? 0) + n(e));
    perEq.set(q, (perEq.get(q) ?? 0) + n(e));
  }
  return { totalSets, totalReps, sessions, last, perCat, perEq };
}

export type Gym = Tables<"gyms">;

export const gymsQuery = queryOptions({
  queryKey: ["gyms"],
  queryFn: async () => {
    const { data, error } = await supabase.from("gyms").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});

const GYM_KEY = "selected-gym";
let gymScope = "";
export function setGymViewScope(actorId: string, targetId: string) {
  gymScope = actorId === targetId ? "" : `:view:${actorId}:${targetId}`;
}
const listeners = new Set<() => void>();
export function getSelectedGym(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(GYM_KEY + gymScope);
}
export function setSelectedGym(id: string | null) {
  if (id) localStorage.setItem(GYM_KEY + gymScope, id);
  else localStorage.removeItem(GYM_KEY + gymScope);
  listeners.forEach((l) => l());
}
export function subscribeGym(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}


export function formatSet(e: { sets: number | null; reps: number | null; load: string | null }, unit = "") {
  const base = `${e.reps ?? "–"}${unit ? ` ${unit}` : ""}${e.load ? ` @ ${e.load}` : ""}`;
  return (e.sets ?? 1) > 1 ? `${e.sets} × ${base}` : base;
}

