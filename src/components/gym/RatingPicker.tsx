import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useUserView } from "@/lib/user-view";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DEFAULT_RATING, RATINGS_DESC, exercisePreferencesQuery, ratingOf, saveRating, type Rating } from "@/lib/exercise-preferences";

/** Compact AI-priority dropdown: trigger shows the symbol, the open menu explains every level (no hover needed on touch). */
export function RatingPicker({ exerciseId, className }: { exerciseId: string; className?: string }) {
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
    <DropdownMenu>
      <DropdownMenuTrigger disabled={readOnly} aria-label={`${t("rating.title")}: ${t(`rating.l${current}`)}`} title={`${t("rating.title")}: ${t(`rating.l${current}`)}`}
        className={cn("inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border px-1.5 align-middle text-base font-normal normal-case disabled:opacity-60", current === DEFAULT_RATING ? "border-border opacity-70" : "border-primary bg-secondary", className)}>
        <span aria-hidden>{t(`rating.r${current}`)}</span><ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="py-1"><div>{t("rating.title")}</div><div className="text-xs font-normal text-muted-foreground">{t("rating.subtitle")}</div></DropdownMenuLabel>
        <DropdownMenuSeparator />
        {RATINGS_DESC.map((r) => (
          <DropdownMenuItem key={r} onSelect={() => void pick(r)} className="gap-2">
            <span className="w-6 text-center text-base" aria-hidden>{t(`rating.r${r}`)}</span>
            <span className="min-w-0 flex-1"><span className="block font-medium">{t(`rating.l${r}`)}</span><span className="block text-xs text-muted-foreground">{t(`rating.d${r}`)}</span></span>
            {r === current && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Read-only symbol for a stored rating snapshot. */
export function RatingMark({ rating }: { rating: number | null | undefined }) {
  const { t } = useLanguage();
  if (rating == null || rating < 1 || rating > 5) return null;
  const r = rating as Rating;
  const label = `${t("rating.atLog")}: ${t(`rating.l${r}`)}`;
  return <span role="img" aria-label={label} title={label} className="ml-1 text-xs">{t(`rating.r${r}`)}</span>;
}
