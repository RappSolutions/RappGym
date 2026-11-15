import { doseText } from "@/lib/gym";
import { cn } from "@/lib/utils";
import type { Exercise, LogEntry } from "@/lib/gym";

export function ExerciseCard({
  ex, last, doneToday, token, onClick, action,
}: {
  ex: Exercise; last?: LogEntry | undefined; doneToday?: number | undefined; token: string; onClick?: () => void; action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-stretch overflow-hidden rounded-xl border bg-card")}>
      <div className={cn("w-1.5 shrink-0", `bg-${token}`)} />
      <button onClick={onClick} className="flex flex-1 items-center gap-3 p-4 text-left active:bg-accent">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("font-display text-lg font-bold", `text-${token}`)}>{ex.code}</span>
            <span className="truncate font-display text-lg font-semibold uppercase">{ex.name}</span>
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {ex.equipment}{ex.dose && ` · ${doseText(ex.dose)}`}
          </div>
          {ex.focus && <div className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">Fokus: {ex.focus}</div>}
        </div>
        <div className="shrink-0 text-right">
          {last ? (
            <>
              <div className="font-display text-xl font-bold">{last.load || "–"}<span className="text-sm text-muted-foreground"> × {last.reps ?? "–"}</span></div>
              <div className="text-xs text-muted-foreground">senast</div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">ny</div>
          )}
          {!!doneToday && <div className="mt-1 rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground">{doneToday} idag</div>}
        </div>
      </button>
      {action}
    </div>
  );
}
