import { useLanguage } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
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
  const active = cat && cats.includes(cat) ? cat : (cats[0] ?? "");
  const last = useMemo(() => lastByCode(log), [log]);
  const today = todayISO();
  const todayCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of log) if (e.date === today && e.gym_id === gym?.id) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets));
    return m;
  }, [log, today, gym?.id]);
  const [open, setOpen] = useState<Exercise | null>(null);
  const s = q.trim().toLowerCase();
  const list = s ? exercises.filter((e) => { const l = localize(e); return [l.code, l.name, l.equipment, l.category].some((v) => v.toLowerCase().includes(s)); }) : exercises.filter((e) => e.category === active);

  if (!gym)
    return (
      <main className="px-4">
        <GymPicker gyms={gyms} selected={null} onPick={(id) => setGym(id)} />
      </main>
    );

  return (
    <main className="space-y-4 px-4">
      <p className="text-sm text-muted-foreground">{t("exercisesIndex.pickAnExerciseToLog")}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4" />{t("exercisesIndex.showAllExercisesOfAvailable", { length: atPlace.length, length_: allExercises.length })}</label>
      {neverCount > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showNever} onChange={(e) => setShowNever(e.target.checked)} className="size-4" />{t("rating.showNever", { count: neverCount })}</label>}
      {!showAll && atPlace.length === 0 && <p className="text-sm text-muted-foreground">{t("exercisesIndex.noExercisesLinkedToThis")}</p>}
      <div className="relative"><Search className="absolute top-3.5 left-3 h-5 w-5 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("exercisesIndex.searchExercise")} className="h-12 pl-10" /></div>
      {todayCount.size > 0 && <p className="text-sm text-muted-foreground">{`${[...todayCount.values()].reduce((a, b) => a + b, 0)} ${t("exercisesIndex.setsLoggedToday")}`}</p>}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => {
          const token = categoryToken(c, cats);
          return (
            <Button
              variant="outline"
              key={c}
              data-category={token}
              aria-pressed={c === active}
              onClick={() => { setQ(""); navigate({ search: { cat: c }, replace: true }); }}
              className={cn(
                "category-theme h-12 shrink-0 rounded-lg border-2 border-category-fill px-5 font-display text-lg font-bold uppercase",
                c === active && !s ? "bg-category-fill text-category-on hover:bg-category-fill hover:text-category-on" : "bg-background text-category-ink hover:bg-category-fill/15 hover:text-category-ink",
              )}
            >
              {c}
            </Button>
          );
        })}
      </div>
      <div className="space-y-2">
        {list.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            last={last.get(ex.code)}
            doneToday={todayCount.get(ex.code)}
            token={categoryToken(ex.category, cats)}
            rating={ratingOf(ratings, ex.id)}
            onClick={() => setOpen(ex)}
          />
        ))}
        {!list.length && <p className="text-muted-foreground">{s ? t("exercisesIndex.noMatches") : t("exercisesIndex.noExercisesYetAddOne")}</p>}
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
