import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GoalsCard } from "@/components/gym/GoalsCard";
import { TrainingInsights } from "@/components/gym/TrainingInsights";
import { Button } from "@/components/ui/button";
import { dashboardStats } from "@/lib/dashboard";
import { goalsQuery } from "@/lib/goals";
import { categoriesOf, categoryToken, exercisesQuery, formatDate, logQuery, todayISO } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import rappgymLogo from "@/assets/rappgym-logo-berlin.png";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hem – RappGym" },
      { name: "description", content: "Din träningsöversikt med statistik, mål och AI-förslag på nästa pass." },
      { property: "og:title", content: "Hem – RappGym" },
      { property: "og:description", content: "Din träningsöversikt med statistik, mål och AI-förslag på nästa pass." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(exercisesQuery),
    context.queryClient.ensureQueryData(logQuery),
    context.queryClient.ensureQueryData(goalsQuery),
  ]),
  component: HomePage,
});

function HomePage() {
  const { t, language } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
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
    <div className="grid items-center gap-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-6">
      <div className="flex justify-center">
        <img src={rappgymLogo} alt="RappGym" width={240} height={240} className="h-28 w-28 object-contain md:h-60 md:w-60" />
      </div>
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
        <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded border border-category-ink/40 bg-category-fill" style={{ width: `${(v / cat30Total) * 100}%` }} /></div>
      </div>)}
    </section>}
    {s.recentDates.length > 0 && <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold uppercase">{t("Senaste pass", "Recent workouts")}</h2>
      <ul className="divide-y divide-border">
        {s.recentDates.map((d) => {
          const rows = log.filter((e) => e.date === d);
          return <li key={d} className="flex justify-between py-2 text-sm"><span className="font-medium">{formatDate(d, language)}</span><span className="text-muted-foreground">{rows.reduce((n, e) => n + (e.sets ?? 1), 0)} {t("set", "sets")} · {new Set(rows.map((e) => e.code)).size} {t("övningar", "exercises")}</span></li>;
        })}
      </ul>
      <Button asChild variant="outline" size="sm"><Link to="/log">{t("Visa logg", "View log")}</Link></Button>
    </section>}
    <GoalsCard />
    <TrainingInsights exercises={exercises} hasLog={log.length > 0} />
  </main>;
}
