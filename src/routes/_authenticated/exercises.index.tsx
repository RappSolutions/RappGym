import { useLanguage } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Lightbulb, ChevronRight } from "lucide-react";
import { useUserView } from "@/lib/user-view";
import { ExerciseSuggestionDialog } from "@/components/gym/ExerciseSuggestionDialog";
import { Input } from "@/components/ui/input";
import { GymPicker } from "@/components/gym/GymPicker";
import { useSelectedGym } from "@/hooks/use-gym";
import { useMemo, useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { LogSheet } from "@/components/gym/LogSheet";
import { Button } from "@/components/ui/button";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { NEVER, exercisePreferencesQuery, ratingOf } from "@/lib/exercise-preferences";
import { categoriesOf, categoryToken, exercisesQuery, gymsQuery, lastByCode, logQuery, todayISO, type Exercise } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/exercises/")({
  validateSearch: z.object({ cat: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Övningar – RappGym" },
      { name: "description", content: "Hitta övningar, läs instruktioner och logga dina set." },
      { property: "og:title", content: "Övningar – RappGym" },
      { property: "og:description", content: "Hitta övningar, läs instruktioner och logga dina set." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(gymsQuery), context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(exerciseLocationsQuery), context.queryClient.ensureQueryData(exercisePreferencesQuery)]),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { t, localize } = useLanguage();
  const { readOnly } = useUserView();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const suggestionButton = <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => setSuggestionOpen(true)} className="shrink-0"><Lightbulb />{t("exerciseSuggestion.title")}</Button>;
  const { data: everyExercise } = useSuspenseQuery(exercisesQuery);
  const allExercises = everyExercise.filter((e) => e.is_active);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [gymId, setGym] = useSelectedGym();
  const gym = gyms.find((g) => g.id === gymId);
  const [q, setQ] = useState("");
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const [showAll, setShowAll] = useState(false);
  const atPlace = exercisesAtLocation(allExercises, links, gymId);
  const { data: ratings } = useSuspenseQuery(exercisePreferencesQuery);
  const [showNever, setShowNever] = useState(false);
  const placed = showAll ? allExercises : atPlace;
  const neverCount = placed.filter((e) => ratingOf(ratings, e.id) === NEVER).length;
  const exercises = showNever ? placed : placed.filter((e) => ratingOf(ratings, e.id) !== NEVER);
  const { data: log } = useSuspenseQuery(logQuery);
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cats = categoriesOf(exercises);
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(cat ? [cat] : []));
  const toggle = (c: string) => {
    const next = new Set(openCats);
    if (next.has(c)) next.delete(c); else next.add(c);
    setOpenCats(next);
    navigate({ search: next.has(c) ? { cat: c } : {}, replace: true });
  };
  const last = useMemo(() => lastByCode(log), [log]);
  const today = todayISO();
  const todayCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of log) if (e.date === today && e.gym_id === gym?.id) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets));
    return m;
  }, [log, today, gym?.id]);
  const [open, setOpen] = useState<Exercise | null>(null);
  const s = q.trim().toLowerCase();
  const list = s ? exercises.filter((e) => { const l = localize(e); return [l.code, l.name, l.equipment, l.category].some((v) => v.toLowerCase().includes(s)); }) : exercises;

  if (!gym)
    return (
      <main className="px-4">
        <div className="flex justify-end">{suggestionButton}</div>
        <ExerciseSuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
        <GymPicker gyms={gyms} selected={null} onPick={(id) => setGym(id)} />
      </main>
    );

  return (
    <main className="space-y-4 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{t("exercisesIndex.pickAnExerciseToLog")}</p>{suggestionButton}</div>
      <ExerciseSuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4" />{t("exercisesIndex.showAllExercisesOfAvailable", { length: atPlace.length, length_: allExercises.length })}</label>
      {neverCount > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showNever} onChange={(e) => setShowNever(e.target.checked)} className="size-4" />{t("rating.showNever", { count: neverCount })}</label>}
      {!showAll && atPlace.length === 0 && <p className="text-sm text-muted-foreground">{t("exercisesIndex.noExercisesLinkedToThis")}</p>}
      <div className="relative"><Search className="absolute top-3.5 left-3 h-5 w-5 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("exercisesIndex.searchExercise")} className="h-12 pl-10" /></div>
      {todayCount.size > 0 && <p className="text-sm text-muted-foreground">{`${[...todayCount.values()].reduce((a, b) => a + b, 0)} ${t("exercisesIndex.setsLoggedToday")}`}</p>}
      <div className="space-y-2">
        {cats.map((c) => {
          const items = (s ? list : exercises).filter((e) => e.category === c);
          if (s && !items.length) return null;
          const isOpen = !!s || openCats.has(c);
          const token = categoryToken(c, cats);
          return (
            <section key={c} data-category={token} className="category-theme">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-2 border-l-4 border-category-fill bg-category-fill/10 px-3 py-2 text-left font-display font-bold uppercase text-category-ink"
              >
                <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                <span className="flex-1">{c}</span>
                <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2">
                  {items.map((ex) => (
                    <ExerciseCard key={ex.id} ex={ex} last={last.get(ex.code)} doneToday={todayCount.get(ex.code)} token={token} rating={ratingOf(ratings, ex.id)} onClick={() => setOpen(ex)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {!(s ? list : exercises).length && <p className="text-muted-foreground">{s ? t("exercisesIndex.noMatches") : t("exercisesIndex.noExercisesYetAddOne")}</p>}
      </div>
      <LogSheet
        exercise={open}
        last={open ? last.get(open.code) : undefined}
        gymId={gym.id}
        onClose={() => setOpen(null)}
      />
    </main>
  );
}
