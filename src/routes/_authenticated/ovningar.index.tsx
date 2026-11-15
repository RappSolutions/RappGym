import { useLanguage } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { categoriesOf, categoryToken, exercisesQuery, lastByCode, logQuery } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/ovningar/")({
  head: () => ({
    meta: [
      { title: "Övningsbank – Träningsdagbok" },
      { name: "description", content: "Sök och bläddra bland alla dina övningar." },
      { property: "og:title", content: "Övningsbank – Träningsdagbok" },
      { property: "og:description", content: "Sök och bläddra bland alla dina övningar." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery)]),
  component: BankPage,
});

function BankPage() {
  const { t, language, localize } = useLanguage();
  const { data: sourceExercises } = useSuspenseQuery(exercisesQuery);
  const exercises = sourceExercises.map(localize);
  const { data: log } = useSuspenseQuery(logQuery);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const cats = categoriesOf(exercises);
  const last = useMemo(() => lastByCode(log), [log]);
  const s = q.toLowerCase();
  const hits = exercises.filter((e) =>
    [e.code, e.name, e.equipment, e.muscles, e.category].some((v) => v.toLowerCase().includes(s)),
  );

  return (
    <main className="space-y-4 px-4">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl font-extrabold uppercase">{t("Övningar", "Exercises")}</h1>
        <Button onClick={() => setAdding(true)} className="font-semibold"><Plus className="h-4 w-4" />{t("Ny", "New")}</Button>
      </div>
      <div className="relative">
        <Search className="absolute top-3.5 left-3 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Sök namn, kod, redskap, muskel…", "Search name, code, equipment, muscle…")} className="h-12 pl-10" />
      </div>
      {cats.map((c) => {
        const list = hits.filter((e) => e.category === c);
        if (!list.length) return null;
        return (
          <section key={c} className="space-y-2">
            <Button variant="ghost" aria-expanded={expanded.has(c)} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(c)) next.delete(c); else next.add(c); return next; })} className={`h-14 w-full justify-start px-0 text-xl font-bold uppercase text-${categoryToken(c, cats)}`}>
              {expanded.has(c) ? <ChevronDown /> : <ChevronRight />}{c} <span className="text-muted-foreground">({list.length})</span>
            </Button>
            {(expanded.has(c) || !!q.trim()) && list.map((ex) => (
              <ExerciseCard key={ex.id} ex={ex} last={last.get(ex.code)} token={categoryToken(c, cats)}
                onClick={() => navigate({ to: "/ovningar/$code", params: { code: ex.code } })} />
            ))}
          </section>
        );
      })}
      <ExerciseForm open={adding} all={sourceExercises} onClose={(saved) => {
        setAdding(false);
        if (saved) navigate({ to: "/ovningar/$code", params: { code: saved.code } });
      }} />
    </main>
  );
}
