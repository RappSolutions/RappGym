import { useLanguage } from "@/lib/i18n";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { InstructionText } from "@/components/gym/InstructionText";
import { formatDate, formatSet, type Exercise, type LogEntry } from "@/lib/gym";

/** Full exercise details shown inline in Settings, so nothing navigates away. */
export function ExerciseDetails({
  exercise,
  log,
  onLog,
}: {
  exercise: Exercise;
  log: LogEntry[];
  onLog: (entry?: LogEntry | null) => void;
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
      {ex.instructions && <InstructionText text={ex.instructions} />}
      
      {chart.length > 1 && (
        <div className="h-40 rounded-xl border bg-card p-2">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Line dataKey="v" name={t("common.load")} stroke="var(--primary)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-sm font-bold uppercase">{t("common.history")}</div>
        {!history.length && <p className="text-sm text-muted-foreground">{t("common.noSetsLoggedYet")}</p>}
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
