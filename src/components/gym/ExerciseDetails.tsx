import { useLanguage } from "@/lib/i18n";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { doseText, formatDate, formatSet, type Exercise, type LogEntry } from "@/lib/gym";

/** Full exercise details shown inline in Settings, so nothing navigates away. */
export function ExerciseDetails({
  exercise,
  log,
  onLog,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  log: LogEntry[];
  onLog: (entry?: LogEntry | null) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, localize } = useLanguage();
  const ex = localize(exercise);
  const history = log.filter((e) => e.code === exercise.code);
  const chart = [...history]
    .reverse()
    .map((e) => ({ d: e.date.slice(5), v: parseFloat(e.load.replace(",", ".")) }))
    .filter((p) => !isNaN(p.v));

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <div className="font-display text-lg font-bold uppercase text-category-ink">{ex.code} · {ex.category}</div>
        <div className="text-2xl font-extrabold uppercase leading-none">{ex.name}</div>
        <p className="mt-1 text-sm text-muted-foreground">{[ex.equipment, ex.variant, ex.muscles].filter(Boolean).join(" · ")}</p>
      </div>
      {ex.dose && <div className="rounded-xl bg-secondary p-3 text-xl font-bold">{doseText(ex.dose)}</div>}
      <ExerciseImages exercise={ex} />
      {ex.instructions && <p className="leading-relaxed">{ex.instructions}</p>}
      {ex.focus && <p className="border-l-4 border-category-fill pl-3"><b>{t("Fokus:", "Focus:")}</b> {ex.focus}</p>}
      <div className="flex gap-2">
        <Button onClick={() => onLog(null)} className="h-12 flex-1 font-bold uppercase"><Plus className="h-5 w-5" />{t("Logga set", "Log sets")}</Button>
        <Button variant="secondary" className="h-12" onClick={onEdit} aria-label={t("Redigera", "Edit")}><Pencil className="h-5 w-5" /></Button>
        <Button variant="secondary" className="h-12" onClick={onDelete} aria-label={t("Ta bort", "Delete")}><Trash2 className="h-5 w-5" /></Button>
      </div>
      {chart.length > 1 && (
        <div className="h-40 rounded-xl border bg-card p-2">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Line dataKey="v" name={t("Belastning", "Load")} stroke="var(--primary)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-sm font-bold uppercase">{t("Historik", "History")}</div>
        {!history.length && <p className="text-sm text-muted-foreground">{t("Inga loggade set ännu.", "No sets logged yet.")}</p>}
        {history.map((e) => (
          <button key={e.id} onClick={() => onLog(e)} className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-left">
            <span className="text-sm text-muted-foreground">{formatDate(e.date)}</span>
            <span className="font-bold">{formatSet(e)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
