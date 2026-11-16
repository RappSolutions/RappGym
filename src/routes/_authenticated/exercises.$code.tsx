import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { LogSheet } from "@/components/gym/LogSheet";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, categoryToken, exercisesQuery, formatDate, logQuery, todayISO, useInvalidateGym, type LogEntry, formatSet, doseText } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/exercises/$code")({
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `${params.code} – RappGym` },
      { name: "description", content: `Instruktioner och historik för övning ${params.code}.` },
      { property: "og:title", content: `${params.code} – RappGym` },
      { property: "og:description", content: `Instruktioner och historik för övning ${params.code}.` },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: ExercisePage,
  notFoundComponent: () => <p className="p-4">Övningen finns inte.</p>,
  errorComponent: ({ error }) => <p className="p-4">{error instanceof Error ? error.message : String(error)}</p>,
});

function ExercisePage() {
  const { t, language, localize } = useLanguage();
  const { code } = Route.useParams();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const navigate = useNavigate();
  const invalidate = useInvalidateGym();
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const original = exercises.find((e) => e.code === code);
  const ex = original ? localize(original) : undefined;
  if (!ex) return <p className="p-4">{t("Övningen finns inte.", "Exercise not found.")} <Link to="/workout" className="underline">{t("Tillbaka", "Back")}</Link></p>;
  const cats = categoriesOf(exercises);
  const token = categoryToken(ex.category, cats);
  const history = log.filter((e) => e.code === code);
  const chart = [...history].reverse().map((e) => ({ d: e.date.slice(5), v: parseFloat(e.load.replace(",", ".")) })).filter((p) => !isNaN(p.v));

  async function remove() {
    if (!ex) return;
    if (!confirm(`${t("Ta bort", "Delete")} ${ex.code} ${ex.name}? ${t("Loggade set behålls.", "Logged sets are kept.")}`)) return;
    const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    navigate({ to: "/workout" });
  }

  return (
    <main data-category={token} className="category-theme space-y-5 px-4">
      <Link to="/workout" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("Träna", "Train")}</Link>
      <div>
        <div className="font-display text-lg font-bold uppercase text-category-ink">{ex.code} · {ex.category}</div>
        <h1 className="text-4xl font-extrabold uppercase leading-none">{ex.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{[ex.equipment, ex.variant, ex.muscles].filter(Boolean).join(" · ")}</p>
      </div>
      {ex.dose && <div className="rounded-xl bg-secondary p-4 text-2xl font-bold">{doseText(ex.dose)}</div>}
      <ExerciseImages exercise={ex} />
      {ex.instructions && <p className="leading-relaxed">{ex.instructions}</p>}
      {ex.focus && <p className="border-l-4 border-category-fill pl-3"><b>{t("Fokus:", "Focus:")}</b> {ex.focus}</p>}
      <div className="flex gap-2">
        <Button onClick={() => { setEntry(null); setLogging(true); }} className="h-12 flex-1 font-bold uppercase"><Plus className="h-5 w-5" />{t("Logga set", "Log sets")}</Button>
        <Button variant="secondary" className="h-12" onClick={() => setEditing(true)} aria-label={t("Redigera", "Edit")}><Pencil className="h-5 w-5" /></Button>
        <Button variant="secondary" className="h-12" onClick={remove} aria-label={t("Ta bort", "Delete")}><Trash2 className="h-5 w-5" /></Button>
      </div>
      {chart.length > 1 && (
        <div className="h-48 rounded-xl border bg-card p-2">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Line dataKey="v" name={t("Belastning", "Load")} stroke="var(--primary)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-xl font-bold uppercase">{t("Historik", "History")}</h2>
        {!history.length && <p className="text-muted-foreground">{t("Inga loggade set ännu.", "No sets logged yet.")}</p>}
        {history.map((e) => (
          <button key={e.id} onClick={() => { setEntry(e); setLogging(true); }} className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left">
            <span className="text-sm text-muted-foreground">{formatDate(e.date)}</span>
            <span className="text-lg font-bold">{formatSet(e)}</span>
          </button>
        ))}
      </section>
      <ExerciseForm open={editing} exercise={original ?? null} all={exercises} onClose={(saved) => {
        setEditing(false);
        if (saved && saved.code !== code) navigate({ to: "/exercises/$code", params: { code: saved.code }, replace: true });
      }} />
      <LogSheet
        exercise={logging ? ex : null}
        entry={entry}
        last={history[0]}
        onClose={() => { setLogging(false); setEntry(null); }}
      />
    </main>
  );
}
