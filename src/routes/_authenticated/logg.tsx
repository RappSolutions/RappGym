import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LogSheet } from "@/components/gym/LogSheet";
import { exercisesQuery, formatDate, logQuery, type LogEntry, formatSet } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/logg")({
  head: () => ({
    meta: [
      { title: "Logg – Träningsdagbok" },
      { name: "description", content: "Alla dina pass, dag för dag." },
      { property: "og:title", content: "Logg – Träningsdagbok" },
      { property: "og:description", content: "Alla dina pass, dag för dag." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: LogPage,
});

function LogPage() {
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const byCode = new Map(exercises.map((e) => [e.code, e]));
  const days = new Map<string, LogEntry[]>();
  for (const e of log) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <main className="space-y-5 px-4">
      <h1 className="text-4xl font-extrabold uppercase">Logg</h1>
      {!log.length && <p className="text-muted-foreground">Inga pass ännu. Importera din Excel-historik under Statistik.</p>}
      {[...days].map(([date, entries]) => {
        const cats = [...new Set(entries.map((e) => byCode.get(e.code)?.category).filter(Boolean))];
        return (
          <section key={date} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold uppercase">{formatDate(date)}</h2>
              <span className="text-xs text-muted-foreground">{cats.join(" · ")} · {entries.reduce((n, x) => n + (x.sets ?? 1), 0)} set</span>
            </div>
            <div className="divide-y rounded-xl border bg-card">
              {entries.map((e) => (
                <button key={e.id} onClick={() => setEntry(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                  <span className="w-12 font-display font-bold text-primary">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{byCode.get(e.code)?.name ?? "Okänd övning"}</span>
                    {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                  </span>
                  <span className="font-display text-lg font-bold">{formatSet(e)}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onClose={() => setEntry(null)} />
    </main>
  );
}
