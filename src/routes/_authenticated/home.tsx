import { isWorkoutFinished, workoutSetProgress } from "@/lib/circuit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { WorkoutBuilder } from "@/components/gym/WorkoutBuilder";
import { CircuitRunner } from "@/components/gym/CircuitRunner";
import { SpontaneousButton } from "@/components/gym/SpontaneousButton";
import { useSelectedGym } from "@/hooks/use-gym";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { StatsCorner } from "@/components/gym/StatsCorner";
import { GoalsCard } from "@/components/gym/GoalsCard";
import { Button } from "@/components/ui/button";
import { dashboardStats } from "@/lib/dashboard";
import { goalsQuery } from "@/lib/goals";
import {
  exercisesQuery,
  formatDate,
  gymsQuery,
  lastByCode,
  logQuery,
  suggestionsQuery,
  todayISO,
  type LogEntry,
} from "@/lib/gym";
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
  loader: ({ context }) =>
    Promise.all([
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
  const [spinning, setSpinning] = useState(false);
  const gym = gyms.find((g) => g.id === gymId) ?? gyms[0];
  const last = useMemo(() => lastByCode(log), [log]);
  const atPlace = exercisesAtLocation(
    exercises.filter((e) => e.is_active),
    links,
    gym?.id ?? null,
  );
  const [running, setRunning] = useState<string | null>(null);
  const todaysPlans = new Map<string, LogEntry[]>();
  for (const r of proposals)
    if (r.date <= todayISO()) {
      const k = r.workout_id ?? r.id;
      todaysPlans.set(k, [...(todaysPlans.get(k) ?? []), r]);
    }
  const s = dashboardStats(log, exercises, todayISO());
  const since =
    s.daysSinceLast === null ? "–" : s.daysSinceLast === 0 ? t("Idag", "Today") : `${s.daysSinceLast} ${t("d", "d")}`;
  const kpis = [
    [t("Pass denna vecka", "Workouts this week"), s.workoutsThisWeek],
    [t("Pass senaste 4 v", "Workouts last 4 wks"), s.workoutsLast28],
    [t("Sedan senaste pass", "Since last workout"), since],
    [t("Veckor i rad", "Week streak"), s.weekStreak],
    [t("Totalt set", "Total sets"), s.totalSets],
    [t("Totalt reps", "Total reps"), s.totalReps],
  ] as const;

  return (
    <main className="space-y-4 px-4">
      <div className="flex justify-center">
        <img
          src={rappgymLogo}
          alt="RappGym"
          width={240}
          height={240}
          onClick={() => setSpinning(true)}
          onAnimationEnd={(e) => e.animationName === "landing-spin-hop" && setSpinning(false)}
          className={`h-28 w-28 cursor-pointer object-contain md:h-48 md:w-48 ${spinning ? "is-spinning" : ""}`}
        />
      </div>
      <section
        className="space-y-2 rounded-xl border-2 border-primary bg-card p-4"
        aria-label={t("Träna nu", "Train now")}
      >
        <h2 className="text-xl font-bold uppercase">
          {t("Träna nu", "Train now")}
          {gym ? <span className="ml-2 text-sm font-normal normal-case text-muted-foreground">{gym.name}</span> : null}
        </h2>
        {[...todaysPlans].map(([id, rows]) => {
          const { done: doneSets, total } = workoutSetProgress(id, rows, log);
          if (isWorkoutFinished(doneSets, total)) return null;
          const ongoing = doneSets > 0;
          return (
            <Button
              key={id}
              size="lg"
              variant="secondary"
              className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
              onClick={() => setRunning(id)}
            >
              <Play className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {ongoing ? `${t("Pågående", "Ongoing")}: ` : ""}
                  {rows[0]?.workout?.title}
                  {rows[0]?.workout?.created_by === "ai" && (
                    <Sparkles className="ml-1 inline size-4 text-primary" aria-label="AI" />
                  )}
                </span>
                <span className="block text-xs font-normal">
                  {rows[0]?.date !== todayISO() ? `${formatDate(rows[0]?.date ?? "")} · ` : ""}
                  {rows.map((r) => r.code).join(" · ")}
                  {ongoing ? ` (${doneSets}/${total} ${t("klara", "done")})` : ""}
                </span>
              </span>
            </Button>
          );
        })}
        {gym && (
          <div className="flex flex-wrap gap-2">
            <div className="min-w-fit grow basis-0">
              <SpontaneousButton gymId={gym.id} size="lg" />
            </div>
            <div className="min-w-fit grow basis-0">
              <WorkoutBuilder exercises={atPlace} last={last} gymId={gym.id} quickStart />
            </div>
          </div>
        )}
      </section>
      {running && <CircuitRunner workoutId={running} onClose={() => setRunning(null)} />}
      <div className="grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
          {kpis.map(([l, v]) => (
            <div key={l} className="min-w-0 rounded-xl border bg-card p-4">
              <div className="text-3xl font-extrabold text-primary">{v}</div>
              <div className="break-words text-xs uppercase text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
      {s.recentDates.length > 0 && false && (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="text-xl font-bold uppercase">{t("Senaste pass", "Recent workouts")}</h2>
          <ul className="divide-y divide-border">
            {s.recentDates.map((d) => {
              const rows = log.filter((e) => e.date === d);
              return (
                <li key={d} className="flex justify-between py-2 text-sm">
                  <span className="font-medium">{formatDate(d)}</span>
                  <span className="text-muted-foreground">
                    {rows.reduce((n, e) => n + (e.sets ?? 1), 0)} {t("set", "sets")} ·{" "}
                    {new Set(rows.map((e) => e.code)).size} {t("övningar", "exercises")}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button asChild variant="outline" size="sm">
            <Link to="/log">{t("Visa logg", "View log")}</Link>
          </Button>
        </section>
      )}
      <GoalsCard />
      <StatsCorner />
    </main>
  );
}
