import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery, type Goal } from "@/lib/goals";
import { formatDate } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";

export function GoalsCard() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) toast.error(error.message);
    await qc.invalidateQueries({ queryKey: goalsQuery.queryKey });
    return !error;
  }
  async function save() {
    const value = text.trim();
    if (!value) return;
    const row = { text: value.slice(0, 300), target_date: date || null };
    const ok = await run(editing ? supabase.from("training_goals").update(row).eq("id", editing) : supabase.from("training_goals").insert(row));
    if (ok) { setText(""); setDate(""); setEditing(null); }
  }
  function edit(g: Goal) { setEditing(g.id); setText(g.text); setDate(g.target_date ?? ""); }

  return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label={t("Mina mål", "My goals")}>
    <h2 className="flex items-center gap-2 text-xl font-bold uppercase"><Target className="size-5 text-primary" />{t("Mina mål", "My goals")}</h2>
    <p className="text-sm text-muted-foreground">{t("Mjuka mål, t.ex. ”Åka skidor i januari”. AI-förslagen tar hänsyn till dem.", "Soft goals, e.g. “Go skiing in January”. AI suggestions take them into account.")}</p>
    <ul className="divide-y divide-border">
      {goals.map((g) => <li key={g.id} className="flex items-center gap-2 py-2">
        <div className={`flex-1 ${g.status === "done" ? "text-muted-foreground line-through" : ""}`}>
          <div className="font-medium">{g.text}</div>
          {g.target_date && <div className="text-xs text-muted-foreground">{t("Mål:", "By:")} {formatDate(g.target_date, language)}</div>}
        </div>
        <Button size="icon" variant="ghost" aria-label={g.status === "done" ? t("Återaktivera", "Reactivate") : t("Klart", "Done")} onClick={() => run(supabase.from("training_goals").update({ status: g.status === "done" ? "active" : "done" }).eq("id", g.id))}>
          {g.status === "done" ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
        </Button>
        <Button size="icon" variant="ghost" aria-label={t("Redigera", "Edit")} onClick={() => edit(g)}><Pencil className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={t("Ta bort", "Delete")} onClick={() => run(supabase.from("training_goals").delete().eq("id", g.id))}><Trash2 className="size-4" /></Button>
      </li>)}
    </ul>
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Input className="min-w-48 flex-1" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={t("Nytt mål…", "New goal…")} aria-label={t("Mål", "Goal")} />
      <Input className="w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("Måldatum (valfritt)", "Target date (optional)")} />
      <Button type="submit" disabled={!text.trim()}><Plus className="size-4" />{editing ? t("Spara", "Save") : t("Lägg till", "Add")}</Button>
      {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setText(""); setDate(""); }}>{t("Avbryt", "Cancel")}</Button>}
    </form>
  </section>;
}
