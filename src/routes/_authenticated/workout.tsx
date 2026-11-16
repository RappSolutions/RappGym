import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Info, MapPin } from "lucide-react";
import { GymPicker } from "@/components/gym/GymPicker";
import { useSelectedGym } from "@/hooks/use-gym";
import { useMemo, useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { LogSheet } from "@/components/gym/LogSheet";
import { Button } from "@/components/ui/button";
import { categoriesOf, categoryToken, exercisesAtGym, exercisesQuery, gymsQuery, lastByCode, logQuery, todayISO, type Exercise } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/workout")({
  validateSearch: z.object({ cat: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dagens pass – RappGym" },
      { name: "description", content: "Välj kategori och logga dina set." },
      { property: "og:title", content: "Dagens pass – RappGym" },
      { property: "og:description", content: "Välj kategori och logga dina set." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(gymsQuery), context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: PassPage,
});

function PassPage() {
  const { t, language, localize } = useLanguage();
  const { data: allExercises } = useSuspenseQuery(exercisesQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [gymId, setGym] = useSelectedGym();
  const [picking, setPicking] = useState(false);
  const gym = gyms.find((g) => g.id === gymId);
  const gymExercises = exercisesAtGym(allExercises, gym?.id ?? null);
  const [showAll, setShowAll] = useState(false);
  const useAll = showAll || gymExercises.length === 0;
  const exercises = useAll ? allExercises : gymExercises;
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
  }, [log, today]);
  const [open, setOpen] = useState<Exercise | null>(null);
  const list = exercises.filter((e) => e.category === active);

  if (!gym || picking)
    return (
      <main className="px-4">
        <GymPicker gyms={gyms} selected={gym?.id ?? null} onPick={(id) => { setGym(id); setPicking(false); }} />
      </main>
    );

  return (
    <main className="space-y-4 px-4">
      <Button variant="secondary" onClick={() => setPicking(true)} className="gap-1.5 rounded-full px-3 text-sm font-medium">
        <MapPin className="h-4 w-4 text-primary" /> {gym.name} <span className="text-muted-foreground">· {t("byt", "change")}</span>
      </Button>
      <p className="text-sm text-muted-foreground">{t("Träna nu: välj en övning och logga dina set. Övningar = bank med instruktioner, Logg = historik.", "Train now: pick an exercise and log your sets. Exercises = library with instructions, Log = history.")}</p>
      {gymExercises.length === 0 ? <p className="rounded-lg border bg-secondary p-3 text-sm">{t(`Inga övningar är kopplade till ${gym.name} än – visar alla dina övningar. Koppla övningar till gymmet (eller "Alla gym") under Övningar.`, `No exercises are linked to ${gym.name} yet – showing all your exercises. Link exercises to this gym (or "All gyms") under Exercises.`)}</p>
        : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />{t("Visa övningar från alla gym", "Show exercises from all gyms")}</label>}
      {todayCount.size > 0 && <p className="text-sm text-muted-foreground">{`${[...todayCount.values()].reduce((a, b) => a + b, 0)} ${t("set loggade idag", "sets logged today")}`}</p>}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => {
          const token = categoryToken(c, cats);
          return (
            <Button
              variant="outline"
              key={c}
              data-category={token}
              aria-pressed={c === active}
              onClick={() => navigate({ search: { cat: c }, replace: true })}
              className={cn(
                "category-theme h-12 shrink-0 rounded-lg border-2 border-category-fill px-5 font-display text-lg font-bold uppercase",
                c === active ? "bg-category-fill text-category-on hover:bg-category-fill hover:text-category-on" : "bg-background text-category-ink hover:bg-category-fill/15 hover:text-category-ink",
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
            onClick={() => setOpen(ex)}
            action={
              <Link to="/exercises/$code" params={{ code: ex.code }} aria-label={t("Visa instruktioner", "View instructions")} className="flex items-center border-l px-3 text-muted-foreground">
                <Info className="h-5 w-5" />
              </Link>
            }
          />
        ))}
        {!list.length && <p className="text-muted-foreground">{t("Inga övningar ännu. Lägg till under Övningar.", "No exercises yet. Add one under Exercises.")}</p>}
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
