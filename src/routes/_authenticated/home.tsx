import { isWorkoutFinished, workoutSetProgress } from "@/lib/circuit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { WorkoutBuilder } from "@/components/gym/WorkoutBuilder";
import { CircuitRunner } from "@/components/gym/CircuitRunner";
import { useSelectedGym } from "@/hooks/use-gym";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { GoalsCard } from "@/components/gym/GoalsCard";
import { Button } from "@/components/ui/button";
import { dashboardStats } from "@/lib/dashboard";
import { goalsQuery } from "@/lib/goals";
import { categoriesOf, categoryToken, exercisesQuery, formatDate, gymsQuery, lastByCode, logQuery, suggestionsQuery, todayISO, type LogEntry } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import rappgymLogo from "@/assets/rappgym-logo-berlin.png";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hem – RappGym" },
      { name: "description", content: "Din träningsöversikt med statistik, mål och senaste pass." },
      { property: "og:title", content: "Hem – RappGym" },
      { property: "og:description", content: "Din träningsöversikt med statistik, mål och senaste pass." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(exercisesQuery),
    context.queryClient.ensureQueryData(logQuery),
    context.queryClient.ensureQueryData(goalsQuery),
    context.queryClient.ensureQueryData(gymsQuery),
    context.queryClient.ensureQueryData(suggestionsQuery),
    context.queryClient.ensureQueryData(exerciseLocationsQuery),
  ]),
  component: HomePage,
});

function HomePage() {
  const { t, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { data: proposals } = useSuspenseQuery(suggestionsQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const [gymId] = useSelectedGym();
  const gym = gyms.find((g) => g.id === gymId) ?? gyms[0];
  const last = useMemo(() => lastByCode(log), [log]);
  const atPlace = exercisesAtLocation(exercises.filter((e) => e.is_active), links, gym?.id ?? null);
  const [running, setRunning] = useState<LogEntry[] | null>(null);
  const todaysPlans = new Map<string, LogEntry[]>();
  for (const r of proposals) if (r.date <= todayISO()) { const k = r.proposal_id ?? r.id; todaysPlans.set(k, [...(todaysPlans.get(k) ?? []), r]); }
  const names = new Map(exercises.map((e) => [e.code, localize(e)]));
  const s = dashboardStats(log, exercises, todayISO());
  const since = s.daysSinceLast === null ? "–" : s.daysSinceLast === 0 ? t("Idag", "Today") : `${s.daysSinceLast} ${t("d", "d")}`;
  const kpis = [
    [t("Pass denna vecka", "Workouts this week"), s.workoutsThisWeek],
    [t("Pass senaste 4 v", "Workouts last 4 wks"), s.workoutsLast28],
    [t("Sedan senaste pass", "Since last workout"), since],
    [t("Veckor i rad", "Week streak"), s.weekStreak],
    [t("Totalt set", "Total sets"), s.totalSets],
    [t("Totalt reps", "Total reps"), s.totalReps],
  ] as const;
  const cat30 = [...s.perCategory30].sort((a, b) => b[1] - a[1]);
  const cat30Total = cat30.reduce((n, [, v]) => n + v, 0);

  return <main className="space-y-4 px-4">
    <div className="flex justify-center"><img src={rappgymLogo} alt="RappGym" width={240} height={240} className="h-28 w-28 object-contain md:h-48 md:w-48" /></div>
    <section className="space-y-2 rounded-xl border-2 border-primary bg-card p-4" aria-label={t("Träna nu", "Train now")}>
      <h2 className="text-xl font-bold uppercase">{t("Träna nu", "Train now")}{gym ? <span className="ml-2 text-sm font-normal normal-case text-muted-foreground">{gym.name}</span> : null}</h2>
      {[...todaysPlans].map(([id, rows]) => {
        const doneSets = log.filter((e) => e.proposal_id === id).reduce((n, e) => n + Math.max(1, e.sets ?? 1), 0);
        const planned = rows.reduce((n, r) => n + Math.max(1, r.sets ?? 1), 0);
        const total = planned;
        if (isWorkoutFinished(doneSets, planned)) return null;
        const ongoing = doneSets > 0;
        return <Button key={id} size="lg" variant={ongoing ? "default" : "secondary"} className="h-auto min-h-12 w-full justify-start whitespace-normal text-left" onClick={() => setRunning(rows)}><Play className="size-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block font-bold">{ongoing ? `${t("Pågående", "Ongoing")}: ` : ""}{rows[0]?.proposal_title}</span><span className="block text-xs font-normal">{rows[0]?.date !== todayISO() ? `${formatDate(rows[0]?.date ?? "")} · ` : ""}{rows.map((r) => r.code).join(" · ")}</span>{ongoing && <span className="block text-xs font-semibold">{t(`${doneSets}/${total} set klara – fortsätt`, `${doneSets}/${total} sets done – continue`)}</span>}</span></Button>;
      })}
      {gym && <WorkoutBuilder exercises={atPlace} last={last} gymId={gym.id} quickStart />}
    </section>
    {running && <CircuitRunner rows={running} names={names} onClose={() => setRunning(null)} />}
    <div className="grid items-center gap-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-6">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        {kpis.map(([l, v]) => <div key={l} className="min-w-0 rounded-xl border bg-card p-4">
          <div className="text-3xl font-extrabold text-primary">{v}</div>
          <div className="break-words text-xs uppercase text-muted-foreground">{l}</div>
        </div>)}
      </div>
    </div>
    {cat30Total > 0 && <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold uppercase">{t("Set per kategori, 30 dagar", "Sets by category, 30 days")}</h2>
      {cat30.map(([k, v]) => <div key={k} data-category={categoryToken(k, categoriesOf(exercises))} className="category-theme">
        <div className="flex justify-between text-sm"><span className="text-category-ink">{k}</span><span className="text-muted-foreground">{v}</span></div>
        <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded border border-category-ink bg-category-fill" style={{ width: `${(v / cat30Total) * 100}%` }} /></div>
      </div>)}
    </section>}
    {s.recentDates.length > 0 && <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold uppercase">{t("Senaste pass", "Recent workouts")}</h2>
      <ul className="divide-y divide-border">
        {s.recentDates.map((d) => {
          const rows = log.filter((e) => e.date === d);
          return <li key={d} className="flex justify-between py-2 text-sm"><span className="font-medium">{formatDate(d)}</span><span className="text-muted-foreground">{rows.reduce((n, e) => n + (e.sets ?? 1), 0)} {t("set", "sets")} · {new Set(rows.map((e) => e.code)).size} {t("övningar", "exercises")}</span></li>;
        })}
      </ul>
      <Button asChild variant="outline" size="sm"><Link to="/log">{t("Visa logg", "View log")}</Link></Button>
    </section>}
    <GoalsCard />
  </main>;
}
