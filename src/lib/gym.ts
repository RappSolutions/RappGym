import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { completedEntries } from "@/lib/workout-suggestions";

export type Exercise = Tables<"exercises">;
export type Workout = Tables<"workouts">;
/** Log row with its optional workout header (title, circuit, origin). */
export type LogEntry = Tables<"log_entries"> & { workout?: Pick<Workout, "id" | "title" | "created_by" | "is_circuit" | "scheduled_date" | "created_at"> | null };
const ENTRY_SELECT = "*, workout:workouts(id,title,created_by,is_circuit,scheduled_date,created_at)";

export const exercisesQuery = queryOptions({
  queryKey: ["exercises"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("sort_order")
      .order("code");
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
      all.push(...(data as LogEntry[]));
      if (data.length < 1000) break;
    }
    return all;
  },
});

export const suggestionsQuery = queryOptions({
  queryKey: ["workout-suggestions"],
  queryFn: async () => {
    const all: LogEntry[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("log_entries").select(ENTRY_SELECT).eq("status", "suggested").order("date").order("proposal_order").range(from, from + 999);
      if (error) throw error;
      all.push(...(data as LogEntry[]));
      if (data.length < 1000) break;
    }
    return all;
  },
});

export function useInvalidateGym() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["log"] });
    qc.invalidateQueries({ queryKey: ["workout-suggestions"] });
    qc.invalidateQueries({ queryKey: ["exercises"] });
  };
}

/** Unique categories in the order they first appear in the exercise bank. */
export function categoriesOf(exercises: Exercise[]): string[] {
  return [...new Set(exercises.map((e) => e.category))];
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

const CAT_TOKENS = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"];
export function categoryToken(category: string, categories: string[]): string {
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
const listeners = new Set<() => void>();
export function getSelectedGym(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(GYM_KEY);
}
export function setSelectedGym(id: string | null) {
  if (id) localStorage.setItem(GYM_KEY, id);
  else localStorage.removeItem(GYM_KEY);
  listeners.forEach((l) => l());
}
export function subscribeGym(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}


export function formatSet(e: { sets: number | null; reps: number | null; load: string | null }) {
  const base = `${e.reps ?? "–"}${e.load ? ` @ ${e.load}` : ""}`;
  return (e.sets ?? 1) > 1 ? `${e.sets} × ${base}` : base;
}

export const doseText = (d: string | null | undefined) => (d ?? "").replace(/varv/gi, "set");
