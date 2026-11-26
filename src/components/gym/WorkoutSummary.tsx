import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { categoriesOf, categoryToken, exercisesQuery, logQuery } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import { formatTonnage } from "@/lib/tonnage";
import { summarizeWorkout } from "@/lib/workout-summary";

/** Shown once after a workout is finished; derived from completed log rows only. */
export function WorkoutSummary({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { t, localize, language } = useLanguage();
  const { data: log = [] } = useQuery(logQuery);
  const { data: exercises = [] } = useQuery(exercisesQuery);
  const byCode = useMemo(() => new Map(exercises.map((e) => [e.code, e])), [exercises]);
  const cats = useMemo(() => categoriesOf(exercises), [exercises]);
  const s = useMemo(() => summarizeWorkout(workoutId, log, (c) => byCode.get(c)?.category ?? "—"), [workoutId, log, byCode]);
  const catName = (c: string) => { const ex = exercises.find((e) => e.category === c); return ex ? localize(ex).category : c; };
  const kpis: [string, string][] = [
    [t("workoutSummary.tonnage"), formatTonnage(s.kg, language)],
    [t("workoutSummary.time"), s.minutes ? `${s.minutes} min` : "—"],
    [t("workoutSummary.kgPerMin"), s.kgPerMin === null ? "—" : `${s.kgPerMin}`],
    [t("workoutSummary.sets"), `${s.sets}`],
    [t("workoutSummary.reps"), `${s.reps}`],
    [t("workoutSummary.effort"), s.avgEffort === null ? "—" : `${s.avgEffort.toLocaleString(language)} · ${t(`effort.l${Math.round(s.avgEffort)}` as "effort.l3")}`],
  ];
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent data-testid="workout-summary">
        <div className="mx-auto w-full max-w-md space-y-4 overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl uppercase">{t("workoutSummary.title")}</DrawerTitle>
            <DrawerDescription>{t("workoutSummary.subtitle", { count: s.exercises })}</DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2">
            {kpis.map(([k, v]) => <div key={k} className="rounded-md border p-2"><div className="text-[11px] uppercase text-muted-foreground">{k}</div><div className="truncate font-semibold tabular-nums">{v}</div></div>)}
          </div>
          {s.prs.length > 0 && <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t("workoutSummary.prs")}</h3>
            {s.prs.map((p) => { const ex = byCode.get(p.code); return <div key={p.code} className="flex items-center gap-2 text-sm"><Trophy className="size-4 shrink-0 text-amber-500" /><span className="font-mono">{p.code}</span><span className="min-w-0 flex-1 truncate">{ex ? localize(ex).name : ""}</span><span className="tabular-nums">{p.previousKg} → <b>{p.kg} kg</b></span></div>; })}
          </div>}
          {s.categories.length > 0 && <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t("workoutSummary.categories")}</h3>
            {s.categories.map((c) => <div key={c.category} data-category={categoryToken(c.category, cats)} className="category-theme grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
              <span className="truncate"><span className="mr-2 inline-block size-2.5 rounded-full bg-category-fill" />{catName(c.category)}</span>
              <span className="tabular-nums text-muted-foreground">{t("workoutSummary.setsCount", { count: c.sets })}</span>
              <span className="w-16 text-right tabular-nums">{c.kg ? formatTonnage(c.kg, language) : "—"}</span>
            </div>)}
          </div>}
          <Button variant="outline" className="w-full" onClick={onClose}>{t("workoutSummary.close")}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
