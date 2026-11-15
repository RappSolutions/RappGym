import { useLanguage } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressOverview } from "@/components/gym/ProgressOverview";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, exercisesQuery, formatDate, logQuery, useInvalidateGym } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/statistik")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Statistik – Träningsdagbok" },
      { name: "description", content: "Följ vikter och antal set över tid, med statistik per övning, kategori och redskap." },
      { property: "og:title", content: "Statistik – Träningsdagbok" },
      { property: "og:description", content: "Följ vikter och antal set över tid, med statistik per övning, kategori och redskap." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: StatsPage,
});

function Bars({ title, data, total }: { title: string; data: Map<string, number>; total: number }) {
  const { t, language, localize } = useLanguage();
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
  const { t, language, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const invalidate = useInvalidateGym();
  const [busy, setBusy] = useState(false);
  const s = computeStats(log, exercises.map(localize));

  async function importExcel() {
    setBusy(true);
    const history = (await import("@/data/history.json")).default;
    const { error } = await supabase
      .from("log_entries")
      .insert(history.map((h) => ({ ...h, gym_id: "00000000-0000-0000-0000-000000000001" })));
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${history.length} ${t("rader importerade", "entries imported")}`);
    invalidate();
  }

  const kpis = [
    [t("Totalt set", "Total sets"), s.totalSets],
    [t("Pass", "Workouts"), s.sessions],
    [t("Totalt reps", "Total reps"), s.totalReps],
    [t("Senaste pass", "Last workout"), s.last ? formatDate(s.last, language) : "–"],
  ] as const;

  return (
    <main className="space-y-4 px-4">
      <h1 className="text-4xl font-extrabold uppercase">{t("Statistik", "Statistics")}</h1>
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4">
            <div className="font-display text-3xl font-extrabold text-primary">{v}</div>
            <div className="text-xs uppercase text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      {log.length > 0 && <ProgressOverview log={log} exercises={exercises} />}
      {s.totalSets > 0 && <Bars title={t("Set per kategori", "Sets by category")} data={s.perCat} total={s.totalSets} />}
      {s.totalSets > 0 && <Bars title={t("Set per redskap", "Sets by equipment")} data={s.perEq} total={s.totalSets} />}
      {log.length === 0 && (
        <div className="space-y-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{t("Hämta in dina 72 tidigare set från Excel-dagboken (3–14 nov 2026).", "Import your 72 previous exercise entries from Excel (3–14 Nov 2026).")}</p>
          <Button onClick={importExcel} disabled={busy} className="w-full font-semibold">{t("Importera Excel-historik", "Import Excel history")}</Button>
        </div>
      )}
    </main>
  );
}
