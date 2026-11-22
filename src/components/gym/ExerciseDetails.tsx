import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { InstructionText } from "@/components/gym/InstructionText";
import { ProgressOverview } from "@/components/gym/ProgressOverview";
import { exerciseHistory, formatExerciseResult } from "@/lib/exercise-history";
import { formatDate, type Exercise, type LogEntry } from "@/lib/gym";

/** Shared details: browsing is read-only unless the caller explicitly supplies an editing action. */
export function ExerciseDetails({
  exercise,
  log,
  onLog,
}: {
  exercise: Exercise;
  log: LogEntry[];
  onLog?: (entry?: LogEntry | null) => void;
}) {
  const { t, localize } = useLanguage();
  const ex = localize(exercise);
  const history = exerciseHistory(log, exercise);

  return (
    <div className="space-y-3">
      <p className="text-sm"><span className="text-muted-foreground">{t("common.equipment")}: </span>{ex.equipment || t("exerciseForm.none")}</p>
      <ExerciseImages exercise={ex} />
      {ex.instructions && <InstructionText text={ex.instructions} />}
      
      {history.length > 0 && <ProgressOverview log={history} exercises={[exercise]} fixedExercise={exercise} />}
      <div className="space-y-1">
        <div className="text-sm font-bold uppercase">{t("common.history")}</div>
        {!history.length && <p className="text-sm text-muted-foreground">{t("common.noSetsLoggedYet")}</p>}
        <div className="max-h-72 overflow-y-auto divide-y">
          {history.map((e) => {
            const result = formatExerciseResult(e, (unit) => t(`repsUnit.${unit}`).toLowerCase());
            const content = <><span className="shrink-0 text-sm text-muted-foreground">{formatDate(e.date)}</span><span className="text-right font-bold">{e.sets > 1 ? `${e.sets} × ` : ""}{result}</span></>;
            return onLog
              ? <Button key={e.id} variant="ghost" onClick={() => onLog(e)} className="flex h-auto w-full items-center justify-between gap-3 whitespace-normal px-2 py-2 text-left">{content}</Button>
              : <div key={e.id} className="flex items-center justify-between gap-3 px-2 py-2">{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
