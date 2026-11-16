import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Circle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { categoriesOf, categoryToken, exercisesQuery, gymsQuery, suggestionsQuery, formatDateWithWeekday, logQuery, type LogEntry, formatSet, todayISO, isWorkoutExpanded, workoutRecordingOrder } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Logg – RappGym" },
      { name: "description", content: "Alla dina pass, dag för dag." },
      { property: "og:title", content: "Logg – RappGym" },
      { property: "og:description", content: "Alla dina pass, dag för dag." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(suggestionsQuery), context.queryClient.ensureQueryData(gymsQuery)]),
  component: LogPage,
});

function LogPage() {
  const { t, language, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { data: proposals } = useSuspenseQuery(suggestionsQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [guidedId, setGuidedId] = useState<string | null>(null);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Map<string, boolean>>(new Map());
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const days = new Map<string, LogEntry[]>();
  for (const e of log) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  const planned = new Map<string, LogEntry[]>();
  for (const row of proposals) {
    const key = row.proposal_id ?? row.id;
    planned.set(key, [...(planned.get(key) ?? []), row]);
  }
  const guidedRows = guidedId ? planned.get(guidedId) ?? [] : [];
  const guidedDone = guidedId ? log.filter((row) => row.proposal_id === guidedId).length : 0;
  function nextExercise() {
    const next = guidedRows.find((row) => row.id !== entry?.id);
    if (next) setEntry(next);
    else { setEntry(null); setGuidedId(null); }
  }

  return (
    <main className="space-y-5 px-4">
      {proposals.length > 0 && <section className="space-y-3 border-b border-border pb-5" aria-label={t("Föreslagna pass", "Suggested workouts")}>
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Circle className="size-5 text-primary" />{t("Föreslagna pass", "Suggested workouts")}</h2>
        {[...planned].map(([id, rows]) => {
          const first = rows[0];
          if (!first) return null;
          const done = log.filter((row) => row.proposal_id === id).length;
          const gym = gyms.find((gym) => gym.id === first.gym_id);
          return <article key={id} className="space-y-3 rounded-lg border-2 border-dashed border-primary bg-secondary p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><span className="font-semibold text-primary">{t("Förslag", "Suggestion")}</span><h3 className="text-xl font-bold">{first.proposal_title}</h3><p className="text-sm">{formatDateWithWeekday(first.date, language)}{gym ? ` · ${gym.name}` : ""}</p></div>
              <span className="text-sm font-medium">{done}/{done + rows.length} {t("övningar genomförda", "exercises completed")}</span>
            </div>
            <div className="divide-y divide-border">{rows.map((row) => <Button key={row.id} variant="ghost" data-category={categoryToken(byCode.get(row.code)?.category ?? "", categories)} className="category-theme grid h-auto min-h-12 w-full grid-cols-[1rem_2.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 whitespace-normal border-l-4 border-category-fill px-2 py-3 text-left sm:grid-cols-[1rem_2.5rem_minmax(0,1fr)_auto]" onClick={() => { setGuidedId(null); setEntry(row); }}>
              <Circle className="size-4 shrink-0 text-primary" /><span className="font-bold text-category-ink">{row.code}</span><span className="min-w-0 break-words">{byCode.get(row.code)?.name}</span><span className="col-span-2 col-start-2 min-w-0 break-words font-semibold sm:col-span-1 sm:col-start-auto">{formatSet(row)}</span>
            </Button>)}</div>
            <Button className="w-full sm:w-auto" onClick={() => { setGuidedId(id); setEntry(first); }}><Play className="size-4" />{done ? t("Fortsätt passet", "Continue workout") : t("Gå igenom passet", "Start workout")}</Button>
          </article>;
        })}
      </section>}
      {log.length > 0 && <h2 className="flex items-center gap-2 text-2xl font-bold"><CheckCircle2 className="size-5 text-primary" />{t("Genomförda pass", "Completed workouts")}</h2>}
      {!log.length && <p className="text-muted-foreground">{t("Inga pass ännu.", "No workouts yet.")}</p>}
      {[...days].map(([date, entries]) => {
        const cats = [...new Set(entries.map((e) => exercises.find((ex) => ex.code === e.code)?.category).filter((c): c is string => !!c))];
        const expanded = isWorkoutExpanded(date, today, expandedOverrides);
        return (
          <section key={date} className="space-y-1">
            <Button variant="ghost" aria-expanded={expanded} aria-controls={`workout-${date}`} onClick={() => setExpandedOverrides((current) => new Map(current).set(date, !isWorkoutExpanded(date, today, current)))} className="h-auto min-h-12 w-full flex-wrap justify-between gap-2 whitespace-normal px-0 text-left">
              <span className="flex items-center gap-2 font-display text-xl font-bold uppercase">{expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}{formatDateWithWeekday(date, language)}</span>
              <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-xs text-muted-foreground">
                {cats.map((cat) => {
                  const exercise = exercises.find((ex) => ex.category === cat);
                  return <span key={cat} data-category={categoryToken(cat, categories)} className="category-theme inline-flex items-center gap-1 font-semibold text-category-ink"><span className="size-2 shrink-0 rounded-full bg-category-fill" />{exercise ? localize(exercise).category : cat}</span>;
                })}
                <span>{entries.reduce((n, x) => n + (x.sets ?? 1), 0)} {t("set", "sets")}</span>
              </span>
            </Button>
            <div id={`workout-${date}`} hidden={!expanded} className="divide-y rounded-xl border bg-card">
              {workoutRecordingOrder(entries).map((e) => (
                <Button variant="ghost" key={e.id} data-category={categoryToken(exercises.find((ex) => ex.code === e.code)?.category ?? "", categories)} onClick={() => setEntry(e)} className="category-theme flex h-auto w-full items-center gap-3 whitespace-normal border-l-4 border-category-fill px-3 py-2.5 text-left">
                  <span className="w-12 shrink-0 font-bold text-category-ink">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{byCode.get(e.code)?.name ?? t("Okänd övning", "Unknown exercise")}</span>
                    {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                  </span>
                  <span className="text-lg font-bold">{formatSet(e)}</span>
                </Button>
              ))}
            </div>
          </section>
        );
      })}
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onCompleted={guidedId ? nextExercise : undefined} progress={guidedId ? `${guidedDone + 1}/${guidedDone + guidedRows.length}` : undefined} onClose={() => { setEntry(null); setGuidedId(null); }} />
    </main>
  );
}
