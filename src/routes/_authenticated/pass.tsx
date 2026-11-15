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
import { categoriesOf, categoryToken, exercisesAtGym, exercisesQuery, gymsQuery, lastByCode, logQuery, todayISO, type Exercise } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/pass")({
  validateSearch: z.object({ cat: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dagens pass – Träningsdagbok" },
      { name: "description", content: "Välj kategori och logga dina set." },
      { property: "og:title", content: "Dagens pass – Träningsdagbok" },
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
  const exercises = exercisesAtGym(allExercises, gym?.id ?? null);
  const { data: log } = useSuspenseQuery(logQuery);
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cats = categoriesOf(exercises);
  const active = cat && cats.includes(cat) ? cat : (cats[0] ?? "");
  const last = useMemo(() => lastByCode(log), [log]);
  const today = todayISO();
  const todayCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of log) if (e.date === today) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets));
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
      <button onClick={() => setPicking(true)} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
        <MapPin className="h-4 w-4 text-primary" /> {gym.name} <span className="text-muted-foreground">· {t("byt", "change")}</span>
      </button>
      <div>
        <h1 className="text-4xl font-extrabold uppercase">{t("Dagens pass", "Today’s workout")}</h1>
        <p className="text-sm text-muted-foreground">{todayCount.size ? `${[...todayCount.values()].reduce((a, b) => a + b, 0)} ${t("set loggade idag", "sets logged today")}` : ""}</p>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => {
          const token = categoryToken(c, cats);
          return (
            <button
              key={c}
              onClick={() => navigate({ search: { cat: c }, replace: true })}
              className={cn(
                "shrink-0 rounded-full border-2 px-5 py-2 font-display text-lg font-bold uppercase",
                c === active ? `border-${token} bg-${token} text-primary-foreground` : `border-${token} text-${token}`,
              )}
            >
              {c}
            </button>
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
              <Link to="/ovningar/$code" params={{ code: ex.code }} aria-label={t("Visa instruktioner", "View instructions")} className="flex items-center border-l px-3 text-muted-foreground">
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
