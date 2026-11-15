import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { LogSheet } from "@/components/gym/LogSheet";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, categoryToken, exercisesQuery, formatDate, logQuery, todayISO, useInvalidateGym, type LogEntry } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/ovningar/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code} – Träningsdagbok` },
      { name: "description", content: `Instruktioner och historik för övning ${params.code}.` },
      { property: "og:title", content: `${params.code} – Träningsdagbok` },
      { property: "og:description", content: `Instruktioner och historik för övning ${params.code}.` },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: ExercisePage,
  notFoundComponent: () => <p className="p-4">Övningen finns inte.</p>,
  errorComponent: ({ error }) => <p className="p-4">{error.message}</p>,
});

function ExercisePage() {
  const { code } = Route.useParams();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const navigate = useNavigate();
  const invalidate = useInvalidateGym();
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const ex = exercises.find((e) => e.code === code);
  if (!ex) return <p className="p-4">Övningen finns inte. <Link to="/ovningar" className="underline">Tillbaka</Link></p>;
  const cats = categoriesOf(exercises);
  const t = categoryToken(ex.category, cats);
  const history = log.filter((e) => e.code === code);
  const today = todayISO();
  const chart = [...history].reverse().map((e) => ({ d: e.date.slice(5), v: parseFloat(e.load.replace(",", ".")) })).filter((p) => !isNaN(p.v));

  async function remove() {
    if (!ex) return;
    if (!confirm(`Ta bort ${ex.code} ${ex.name}? Loggade set behålls.`)) return;
    const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
    if (error) return toast.error(error.message);
    invalidate();
    navigate({ to: "/ovningar" });
  }

  return (
    <main className="space-y-5 px-4">
      <Link to="/ovningar" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Övningar</Link>
      <div>
        <div className={`font-display text-lg font-bold uppercase text-${t}`}>{ex.code} · {ex.category}</div>
        <h1 className="text-4xl font-extrabold uppercase leading-none">{ex.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{[ex.equipment, ex.variant, ex.muscles].filter(Boolean).join(" · ")}</p>
      </div>
      {ex.dose && <div className="rounded-xl bg-secondary p-4 font-display text-2xl font-bold">{ex.dose}</div>}
      {ex.instructions && <p className="leading-relaxed">{ex.instructions}</p>}
      {ex.focus && <p className={`border-l-4 pl-3 border-${t}`}><b>Fokus:</b> {ex.focus}</p>}
      <div className="flex gap-2">
        <Button onClick={() => { setEntry(null); setLogging(true); }} className="h-12 flex-1 font-bold uppercase"><Plus className="h-5 w-5" /> Logga set</Button>
        <Button variant="secondary" className="h-12" onClick={() => setEditing(true)} aria-label="Redigera"><Pencil className="h-5 w-5" /></Button>
        <Button variant="secondary" className="h-12" onClick={remove} aria-label="Ta bort"><Trash2 className="h-5 w-5" /></Button>
      </div>
      {chart.length > 1 && (
        <div className="h-48 rounded-xl border bg-card p-2">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Line dataKey="v" name="Belastning" stroke="var(--primary)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-xl font-bold uppercase">Historik</h2>
        {!history.length && <p className="text-muted-foreground">Inga loggade set ännu.</p>}
        {history.map((e) => (
          <button key={e.id} onClick={() => { setEntry(e); setLogging(true); }} className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left">
            <span className="text-sm text-muted-foreground">{formatDate(e.date)} · varv {e.sets}</span>
            <span className="font-display text-lg font-bold">{e.load || "–"} × {e.reps ?? "–"}</span>
          </button>
        ))}
      </section>
      <ExerciseForm open={editing} exercise={ex} all={exercises} onClose={(saved) => {
        setEditing(false);
        if (saved && saved.code !== code) navigate({ to: "/ovningar/$code", params: { code: saved.code }, replace: true });
      }} />
      <LogSheet
        exercise={logging ? ex : null}
        entry={entry}
        last={history[0]}
        defaultRound={history.filter((e) => e.date === today).length + 1}
        onClose={() => { setLogging(false); setEntry(null); }}
      />
    </main>
  );
}
