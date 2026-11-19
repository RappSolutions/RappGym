import { supabase } from "@/integrations/supabase/client";
import { todayISO, type LogEntry } from "@/lib/gym";

/** New proposal_order values after moving one row up (-1) or down (+1); returns only rows whose order changes. */
export function reorderRows(rows: readonly { id: string; proposal_order: number | null }[], id: string, dir: -1 | 1): { id: string; proposal_order: number }[] {
  const ordered = [...rows].sort((a, b) => (a.proposal_order ?? 0) - (b.proposal_order ?? 0));
  const from = ordered.findIndex((r) => r.id === id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= ordered.length) return [];
  const moved = [...ordered];
  [moved[from], moved[to]] = [moved[to]!, moved[from]!];
  return moved.map((r, i) => ({ id: r.id, proposal_order: i, before: r.proposal_order })).filter((r) => r.before !== r.proposal_order).map(({ id, proposal_order }) => ({ id, proposal_order }));
}

/** Next order slot after the existing planned rows. */
export function nextOrder(rows: readonly { proposal_order: number | null }[]): number {
  return rows.reduce((m, r) => Math.max(m, (r.proposal_order ?? -1) + 1), 0);
}

export async function moveRow(rows: LogEntry[], id: string, dir: -1 | 1) {
  for (const u of reorderRows(rows, id, dir)) {
    const { error } = await supabase.from("log_entries").update({ proposal_order: u.proposal_order }).eq("id", u.id).eq("status", "suggested");
    if (error) throw error;
  }
}

export async function addPlannedExercise(workoutId: string, code: string, rows: LogEntry[], gymId: string | null, lastLoad: string, sets: number, reps: number) {
  const { error } = await supabase.from("log_entries").insert({ code, sets: Math.max(1, sets), reps, load: lastLoad, date: todayISO(), gym_id: gymId, status: "suggested", workout_id: workoutId, proposal_order: nextOrder(rows) });
  if (error) throw error;
}

/** Removes a planned row only; completed sets are facts and never touched here. */
export async function removePlannedRow(id: string) {
  const { error } = await supabase.from("log_entries").delete().eq("id", id).eq("status", "suggested");
  if (error) throw error;
}

/** Move a planned row to another phase (intro/main/outro); completed rows are never touched. */
export async function setRowPhase(id: string, phase: "intro" | "main" | "outro") {
  const { error } = await supabase.from("log_entries").update({ phase }).eq("id", id).eq("status", "suggested");
  if (error) throw error;
}
