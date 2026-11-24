import { groupByPhase } from "@/lib/circuit";

type Ex = { id: string; code: string; name: string; category: string; equipment: string; reps_unit?: string | null };
type Gym = { id: string; name: string };

export type PrintRow = { code: string; exercise_id: string; sets: number; reps: number | null; load: string; note: string | null; phase: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const target = (r: { reps: number | null; load: string }, unit: string) =>
  [r.load, r.reps != null ? `${r.reps}${unit && unit !== "reps" ? ` ${unit}` : ""}` : ""].filter(Boolean).join(" × ");

/** Self-contained printable HTML for a planned workout; lap boxes up to max sets in the workout. */
export function workoutPrintHtml(w: { title: string; date: string; gym?: string | undefined; labels: { lap: string; note: string; phases: Record<string, string> } }, rows: readonly PrintRow[], exercises: readonly Ex[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const laps = Math.max(1, ...rows.map((r) => r.sets || 1));
  const head = `<tr><th>#</th><th></th><th></th><th></th>${Array.from({ length: laps }, (_, i) => `<th>${esc(w.labels.lap)} ${i + 1}</th>`).join("")}<th>${esc(w.labels.note)}</th></tr>`;
  let n = 0;
  const sections = groupByPhase(rows).map(({ phase, rows: rs }) =>
    `<h2>${esc(w.labels.phases[phase] ?? phase)}</h2><table>${head}${rs.map((r) => {
      const e = byId.get(r.exercise_id);
      const boxes = Array.from({ length: laps }, (_, i) => `<td class="box">${i < (r.sets || 1) ? "" : "—"}</td>`).join("");
      return `<tr><td>${++n}</td><td><b>${esc(r.code)}</b> ${esc(e?.name ?? "")}<br><small>${esc(e?.equipment ?? "")}</small></td><td>${esc(target(r, e?.reps_unit ?? ""))}</td><td><small>${esc(r.note ?? "")}</small></td>${boxes}<td class="note"></td></tr>`;
    }).join("")}</table>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(w.title)} ${w.date}</title><style>
@page{size:A4;margin:12mm}body{font:11pt Arial,sans-serif;color:#000}h1{font-size:16pt;margin:0}p{margin:2px 0 8px}h2{font-size:12pt;margin:12px 0 4px}
table{width:100%;border-collapse:collapse;break-inside:avoid}td,th{border:1px solid #000;padding:4px;text-align:left;vertical-align:top}th{font-size:9pt}.box{width:14mm}.note{width:30mm}
</style></head><body><h1>${esc(w.title)}</h1><p>${w.date}${w.gym ? ` · ${esc(w.gym)}` : ""}</p>${sections}</body></html>`;
}

export function printHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
  setTimeout(() => win.print(), 300);
  return true;
}

type LogRow = { date: string; created_at: string; code: string; exercise_id: string | null; exercise_name: string; gym_id: string | null; phase: string; lap: number | null; set_number: number | null; load: string; reps: number | null; reps_unit: string; exercise_rating: number | null; note: string | null; workout?: { title: string } | null };

export const LOG_EXPORT_COLUMNS = ["date", "time", "location", "workout", "phase", "category", "code", "exercise", "equipment", "lap", "set", "load", "reps", "unit", "rating", "note"] as const;

/** Completed log facts as sheet rows, oldest first; dates ISO, time HH:MM (UTC). */
export function logExportRows(log: readonly LogRow[], exercises: readonly Ex[], gyms: readonly Gym[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const gym = new Map(gyms.map((g) => [g.id, g.name]));
  return [...log].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)).map((r) => {
    const e = r.exercise_id ? byId.get(r.exercise_id) : undefined;
    return [r.date, r.created_at.slice(11, 16), r.gym_id ? gym.get(r.gym_id) ?? "" : "", r.workout?.title ?? "", r.phase, e?.category ?? "", r.code, r.exercise_name || e?.name || "", e?.equipment ?? "", r.lap ?? "", r.set_number ?? "", r.load, r.reps ?? "", r.reps_unit, r.exercise_rating ?? "", r.note ?? ""];
  });
}

export async function downloadLogXlsx(header: readonly string[], rows: (string | number)[][], today: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([[...header], ...rows]);
  ws["!cols"] = header.map((_, i) => ({ wch: [11, 6, 14, 22, 9, 10, 7, 26, 14, 5, 5, 8, 6, 6, 6, 30][i] ?? 10 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Log");
  XLSX.writeFile(wb, `rappgym-log-${today}.xlsx`);
}
