import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Exercise = Tables<"exercises">;
export type LogEntry = Tables<"log_entries">;

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
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) break;
    }
    return all;
  },
});

export function useInvalidateGym() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["log"] });
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
  for (const e of log) if (!m.has(e.code)) m.set(e.code, e);
  return m;
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function isWorkoutExpanded(date: string, today: string, overrides: Map<string, boolean>) {
  return overrides.get(date) ?? date === today;
}

const CAT_TOKENS = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"];
export function categoryToken(category: string, categories: string[]): string {
  const i = categories.indexOf(category);
  return CAT_TOKENS[(i < 0 ? 0 : i) % CAT_TOKENS.length] ?? "cat-1";
}

export function formatDate(iso: string, language: "sv" | "en" = "sv") {
  return new Date(iso + "T12:00:00").toLocaleDateString(language === "en" ? "en-GB" : "sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function computeStats(log: LogEntry[], exercises: Exercise[]) {
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

/** Exercises available at a gym: those linked to it plus those for all gyms (no gym). */
export function exercisesAtGym(exercises: Exercise[], gymId: string | null) {
  return exercises.filter((e) => !e.gym_id || e.gym_id === gymId);
}

export function formatSet(e: { sets: number | null; reps: number | null; load: string | null }) {
  const base = `${e.reps ?? "–"}${e.load ? ` @ ${e.load}` : ""}`;
  return (e.sets ?? 1) > 1 ? `${e.sets} × ${base}` : base;
}

export const doseText = (d: string | null | undefined) => (d ?? "").replace(/varv/gi, "set");
