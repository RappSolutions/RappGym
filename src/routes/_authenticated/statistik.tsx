import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, exercisesQuery, formatDate, logQuery, useInvalidateGym } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/statistik")({
  head: () => ({
    meta: [
      { title: "Statistik – Träningsdagbok" },
      { name: "description", content: "Set, pass och reps per kategori och redskap." },
      { property: "og:title", content: "Statistik – Träningsdagbok" },
      { property: "og:description", content: "Set, pass och reps per kategori och redskap." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: StatsPage,
});

function Bars({ title, data, total }: { title: string; data: Map<string, number>; total: number }) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold uppercase">{title}</h2>
      {[...data].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{v} · {Math.round((v / total) * 100)}%</span></div>
          <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
        </div>
      ))}
    </section>
  );
}

function StatsPage() {
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const invalidate = useInvalidateGym();
  const [busy, setBusy] = useState(false);
  const s = computeStats(log, exercises);

  async function importExcel() {
    setBusy(true);
    const history = (await import("@/data/history.json")).default;
    const { error } = await supabase.from("log_entries").insert(history);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${history.length} set importerade`);
    invalidate();
  }

  const kpis = [
    ["Totalt set", s.totalSets],
    ["Pass", s.sessions],
    ["Totalt reps", s.totalReps],
    ["Senaste pass", s.last ? formatDate(s.last) : "–"],
  ] as const;

  return (
    <main className="space-y-4 px-4">
      <h1 className="text-4xl font-extrabold uppercase">Statistik</h1>
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4">
            <div className="font-display text-3xl font-extrabold text-primary">{v}</div>
            <div className="text-xs uppercase text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      {s.totalSets > 0 && <Bars title="Set per kategori" data={s.perCat} total={s.totalSets} />}
      {s.totalSets > 0 && <Bars title="Set per redskap" data={s.perEq} total={s.totalSets} />}
      {log.length === 0 && (
        <div className="space-y-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Hämta in dina 72 tidigare set från Excel-dagboken (3–14 nov 2026).</p>
          <Button onClick={importExcel} disabled={busy} className="w-full font-semibold">Importera Excel-historik</Button>
        </div>
      )}
    </main>
  );
}
