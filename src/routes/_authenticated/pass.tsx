import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { LogSheet } from "@/components/gym/LogSheet";
import { categoriesOf, categoryToken, exercisesQuery, lastByCode, logQuery, todayISO, type Exercise } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/pass")({
  validateSearch: z.object({ cat: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Dagens pass – Träningsdagbok" },
      { name: "description", content: "Välj kategori och logga dina set." },
      { property: "og:title", content: "Dagens pass – Träningsdagbok" },
      { property: "og:description", content: "Välj kategori och logga dina set." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: PassPage,
});

function PassPage() {
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cats = categoriesOf(exercises);
  const active = cat && cats.includes(cat) ? cat : cats[0];
  const last = useMemo(() => lastByCode(log), [log]);
  const today = todayISO();
  const todayCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of log) if (e.date === today) m.set(e.code, (m.get(e.code) ?? 0) + 1);
    return m;
  }, [log, today]);
  const [open, setOpen] = useState<Exercise | null>(null);
  const list = exercises.filter((e) => e.category === active);

  return (
    <main className="space-y-4 px-4">
      <div>
        <h1 className="text-4xl font-extrabold uppercase">Dagens pass</h1>
        <p className="text-sm text-muted-foreground">{todayCount.size ? `${[...todayCount.values()].reduce((a, b) => a + b, 0)} set loggade idag` : "Tryck på en övning för att logga"}</p>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => {
          const t = categoryToken(c, cats);
          return (
            <button
              key={c}
              onClick={() => navigate({ search: { cat: c }, replace: true })}
              className={cn(
                "shrink-0 rounded-full border-2 px-5 py-2 font-display text-lg font-bold uppercase",
                c === active ? `border-${t} bg-${t} text-primary-foreground` : `border-${t} text-${t}`,
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
              <Link to="/ovningar/$code" params={{ code: ex.code }} aria-label="Visa instruktioner" className="flex items-center border-l px-3 text-muted-foreground">
                <Info className="h-5 w-5" />
              </Link>
            }
          />
        ))}
        {!list.length && <p className="text-muted-foreground">Inga övningar ännu. Lägg till under Övningar.</p>}
      </div>
      <LogSheet
        exercise={open}
        last={open ? last.get(open.code) : undefined}
        defaultRound={open ? (todayCount.get(open.code) ?? 0) + 1 : 1}
        onClose={() => setOpen(null)}
      />
    </main>
  );
}
