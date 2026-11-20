import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useUserView } from "@/lib/user-view";
import { cn } from "@/lib/utils";
import { RATINGS, exercisePreferencesQuery, ratingOf, saveRating, type Rating } from "@/lib/exercise-preferences";

export function RatingPicker({ exerciseId }: { exerciseId: string }) {
  const { t } = useLanguage();
  const { readOnly } = useUserView();
  const qc = useQueryClient();
  const { data: ratings } = useQuery(exercisePreferencesQuery);
  if (!ratings) return null;
  const current = ratingOf(ratings, exerciseId);
  async function pick(r: Rating) {
    if (readOnly || r === current) return;
    try { await saveRating(exerciseId, r); await qc.invalidateQueries({ queryKey: exercisePreferencesQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{t("rating.title")}</div>
      <div role="radiogroup" aria-label={t("rating.title")} className="grid grid-cols-5 overflow-hidden rounded-lg border">
        {RATINGS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={r === current} disabled={readOnly} onClick={() => pick(r)}
            className={cn("border-l px-1 py-1.5 text-xs first:border-l-0 disabled:opacity-60", r === current ? "bg-secondary font-bold text-secondary-foreground" : "bg-background text-muted-foreground")}>
            {t(`rating.r${r}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("rating.hint")}</p>
    </div>
  );
}
