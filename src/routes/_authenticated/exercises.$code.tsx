import { useIsAdmin } from "@/lib/roles";
import { useUserView } from "@/lib/user-view";
import { confirmDialog } from "@/components/gym/ConfirmHost";
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
import { InstructionText } from "@/components/gym/InstructionText";
import { RatingPicker } from "@/components/gym/RatingPicker";
import { exercisePreferencesQuery } from "@/lib/exercise-preferences";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, categoryToken, exercisesQuery, formatDate, logQuery, todayISO, useInvalidateGym, type LogEntry, formatSet } from "@/lib/gym";

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
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(exercisePreferencesQuery)]),
  component: ExercisePage,
  notFoundComponent: () => <p className="p-4">Övningen finns inte.</p>,
  errorComponent: ({ error }) => <p className="p-4">{error instanceof Error ? error.message : String(error)}</p>,
});

function ExercisePage() {
  const { t, language, localize } = useLanguage();
  const { readOnly } = useUserView();
  const { isAdmin } = useIsAdmin();
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
  if (!ex) return <p className="p-4">{t("exercisesDetail.exerciseNotFound")} <Link to="/exercises" className="underline">{t("exercisesDetail.back")}</Link></p>;
  const cats = categoriesOf(exercises);
  const token = categoryToken(ex.category, cats);
  const history = log.filter((e) => e.code === code);
  const chart = [...history].reverse().map((e) => ({ d: e.date.slice(5), v: parseFloat(e.load.replace(",", ".")) })).filter((p) => !isNaN(p.v));

  async function remove() {
    if (!ex) return;
    if (!await confirmDialog(`${t("common.delete")} ${ex.code} ${ex.name}? ${t("exercisesDetail.loggedSetsAreKept")}`)) return;
    const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    navigate({ to: "/exercises" });
  }

  return (
    <main data-category={token} className="category-theme space-y-5 px-4">
      <Link to="/exercises" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("common.exercises")}</Link>
      <div>
        <div className="font-display text-lg font-bold uppercase text-category-ink">{ex.code} · {ex.category}</div>
        <div className="flex items-start justify-between gap-2"><h1 className="text-4xl font-extrabold uppercase leading-none">{ex.name}</h1><RatingPicker exerciseId={ex.id} /></div>
        <p className="mt-2 text-sm text-muted-foreground">{ex.equipment}</p>
      </div>
      <ExerciseImages exercise={ex} />
      {ex.instructions && <InstructionText text={ex.instructions} />}
      <div className="flex gap-2">
        <Button disabled={readOnly} onClick={() => { setEntry(null); setLogging(true); }} className="h-12 flex-1 font-bold uppercase"><Plus className="h-5 w-5" />{t("common.logSets")}</Button>
        {isAdmin && <Button variant="secondary" className="h-12" onClick={() => setEditing(true)} aria-label={t("common.edit")}><Pencil className="h-5 w-5" /></Button>}
        {isAdmin && <Button variant="secondary" className="h-12" onClick={remove} aria-label={t("common.delete")}><Trash2 className="h-5 w-5" /></Button>}
      </div>
      {chart.length > 1 && (
        <div className="h-48 rounded-xl border bg-card p-2">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Line dataKey="v" name={t("common.load")} stroke="var(--primary)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-xl font-bold uppercase">{t("common.history")}</h2>
        {!history.length && <p className="text-muted-foreground">{t("common.noSetsLoggedYet")}</p>}
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
