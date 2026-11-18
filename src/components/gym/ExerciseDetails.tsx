import { useLanguage } from "@/lib/i18n";
import { Pencil, Trash2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { formatDate, formatSet, type Exercise, type LogEntry } from "@/lib/gym";

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
    <div className="space-y-3">
      
      <ExerciseImages exercise={ex} />
      {ex.instructions && <p className="whitespace-pre-line leading-relaxed">{ex.instructions}</p>}
      
      <div className="flex gap-2">
        <Button variant="secondary" className="h-12 flex-1" onClick={onEdit} aria-label={t("Redigera", "Edit")}><Pencil className="h-5 w-5" /></Button>
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
