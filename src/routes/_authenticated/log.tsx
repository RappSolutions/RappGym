import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { exercisesQuery, formatDate, logQuery, type LogEntry, formatSet, todayISO, isWorkoutExpanded } from "@/lib/gym";

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
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: LogPage,
});

function LogPage() {
  const { t, language, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Map<string, boolean>>(new Map());
  const today = todayISO();
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const days = new Map<string, LogEntry[]>();
  for (const e of log) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <main className="space-y-5 px-4">
      {!log.length && <p className="text-muted-foreground">{t("Inga pass ännu.", "No workouts yet.")}</p>}
      {[...days].map(([date, entries]) => {
        const cats = [...new Set(entries.map((e) => byCode.get(e.code)?.category).filter(Boolean))];
        const expanded = isWorkoutExpanded(date, today, expandedOverrides);
        return (
          <section key={date} className="space-y-1">
            <Button variant="ghost" aria-expanded={expanded} aria-controls={`workout-${date}`} onClick={() => setExpandedOverrides((current) => new Map(current).set(date, !isWorkoutExpanded(date, today, current)))} className="h-auto min-h-12 w-full justify-between gap-2 whitespace-normal px-0 text-left">
              <span className="flex items-center gap-2 text-xl font-bold uppercase">{expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}{formatDate(date, language)}</span>
              <span className="text-right text-xs text-muted-foreground">{cats.join(" · ")} · {entries.reduce((n, x) => n + (x.sets ?? 1), 0)} {t("set", "sets")}</span>
            </Button>
            <div id={`workout-${date}`} hidden={!expanded} className="divide-y rounded-xl border bg-card">
              {entries.map((e) => (
                <Button variant="ghost" key={e.id} onClick={() => setEntry(e)} className="flex h-auto w-full items-center gap-3 whitespace-normal px-4 py-2.5 text-left">
                  <span className="w-12 font-display font-bold text-primary">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{byCode.get(e.code)?.name ?? t("Okänd övning", "Unknown exercise")}</span>
                    {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                  </span>
                  <span className="font-display text-lg font-bold">{formatSet(e)}</span>
                </Button>
              ))}
            </div>
          </section>
        );
      })}
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onClose={() => setEntry(null)} />
    </main>
  );
}
