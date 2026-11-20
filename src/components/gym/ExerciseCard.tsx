import { useLanguage } from "@/lib/i18n";
import type { Exercise, LogEntry } from "@/lib/gym";
import { Button } from "@/components/ui/button";
import type { Rating } from "@/lib/exercise-preferences";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ExerciseCard({
  ex, last, doneToday, token, onClick, action, expanded, children, hideLast, rating,
}: {
  ex: Exercise; last?: LogEntry | undefined; doneToday?: number | undefined; token: string; onClick?: () => void; action?: React.ReactNode; expanded?: boolean; children?: React.ReactNode; hideLast?: boolean; rating?: Rating;
}) {
  const { t, language, localize } = useLanguage();
  ex = localize(ex);
  return (
    <div data-category={token} className="category-theme flex items-stretch overflow-hidden rounded-xl border bg-card">
      <div className="w-1.5 shrink-0 bg-category-fill" />
      <div className="min-w-0 flex-1">
      <div className="flex items-stretch">
      <Button variant="ghost" aria-expanded={expanded} onClick={onClick} className="flex h-auto min-w-0 flex-1 items-center gap-3 whitespace-normal p-4 text-left active:bg-accent">
        {expanded !== undefined && (expanded ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />)}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-category-ink">{ex.code}</span>
            <span className="truncate font-display text-lg font-semibold uppercase">{ex.name}</span>
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {ex.equipment}
            {rating !== undefined && rating !== 3 && <span className="ml-2 rounded border px-1 text-xs">{t("rating.title")}: {t(`rating.r${rating}`)}</span>}
          </div>
          
        </div>
        {!hideLast && <div className="shrink-0 text-right">
          {last ? (
            <>
              <div className="text-xl font-bold">{last.load || "–"}<span className="text-sm text-muted-foreground"> × {last.reps ?? "–"}</span></div>
              <div className="text-xs text-muted-foreground">{t("exerciseCard.last")}</div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">{t("exerciseCard.new")}</div>
          )}
          {!!doneToday && <div className="mt-1 rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground">{doneToday} {t("exerciseCard.today")}</div>}
        </div>}
      </Button>
      {action}
      </div>
      {expanded && children && <div className="border-t p-4">{children}</div>}
      </div>
    </div>
  );
}
