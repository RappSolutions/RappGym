import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Flag, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery, isGoalOpen, sortGoals, type Goal, type GoalStatus } from "@/lib/goals";
import { formatDate } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";

export function GoalsCard() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const label: Record<GoalStatus, string> = {
    active: t("Aktivt", "Active"),
    fulfilled: t("Uppnått! 🎉", "Fulfilled! 🎉"),
    partly: t("Delvis uppnått", "Partly achieved"),
    postponed: t("Skjuter upp", "Postponed"),
    nevermind: t("Strunt samma", "Never mind"),
  };
  const sorted = sortGoals(goals);
  const open = sorted.filter(isGoalOpen);
  const closed = sorted.filter((g) => !isGoalOpen(g));

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
    const ok = await run(
      editing
        ? supabase.from("training_goals").update(row).eq("id", editing)
        : supabase.from("training_goals").insert(row),
    );
    if (ok) {
      setText("");
      setDate("");
      setEditing(null);
    }
  }
  function edit(g: Goal) {
    setEditing(g.id);
    setText(g.text);
    setDate(g.target_date ?? "");
  }
  const setStatus = (g: Goal, status: GoalStatus) =>
    run(supabase.from("training_goals").update({ status }).eq("id", g.id));

  const row = (g: Goal) => (
    <li key={g.id} className="flex items-center gap-2 py-2">
      <div className={`min-w-0 flex-1 ${isGoalOpen(g) ? "" : "text-muted-foreground"}`}>
        <div className="font-medium">{g.text}</div>
        <div className="text-xs text-muted-foreground">
          {g.target_date && (
            <>
              {t("Mål:", "By:")} {formatDate(g.target_date)} ·{" "}
            </>
          )}
          {t("Skapat", "Created")} {formatDate(g.created_at.slice(0, 10))}
          {!isGoalOpen(g) && (
            <>
              {" "}
              · <span className="font-semibold">{label[g.status as GoalStatus] ?? g.status}</span>
            </>
          )}
        </div>
      </div>
      {!isGoalOpen(g) && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("Återaktivera", "Reactivate")}
          title={t("Återaktivera", "Reactivate")}
          onClick={() => void setStatus(g, "active")}
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={t("Avsluta mål", "Finalize goal")}>
            <Flag className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["fulfilled", "partly", "postponed", "nevermind", "active"] as const)
            .filter((s) => s !== g.status)
            .map((s) => (
              <DropdownMenuItem key={s} className="min-h-11" onSelect={() => void setStatus(g, s)}>
                {s === "active" ? t("Återaktivera", "Reactivate") : label[s]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="icon" variant="ghost" aria-label={t("Redigera", "Edit")} onClick={() => edit(g)}>
        <Pencil className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t("Ta bort", "Delete")}
        onClick={async () => {
          if (await confirmDialog(t(`Ta bort målet "${g.text}"?`, `Delete the goal "${g.text}"?`)))
            void run(supabase.from("training_goals").delete().eq("id", g.id));
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" aria-label={t("Mina mål", "My goals")}>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-0"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <span className="font-display text-xl font-bold">{t("Mina mål", "My goals")}</span>
      </Button>
      {open && (
        <>
          <h2 className="flex items-center gap-2 text-xl font-bold uppercase">
            <Target className="size-5 text-primary" />
            {t("Mina mål", "My goals")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Mjuka mål, t.ex. ”Åka skidor i januari”. AI-förslagen tar hänsyn till aktiva mål.",
              "Soft goals, e.g. “Go skiing in January”. AI suggestions take active goals into account.",
            )}
          </p>
          <ul className="divide-y divide-border">{open.map(row)}</ul>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Input
              className="min-w-48 flex-1"
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Nytt mål…", "New goal…")}
              aria-label={t("Mål", "Goal")}
            />
            <Input
              className="w-40"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label={t("Måldatum (valfritt)", "Target date (optional)")}
            />
            <Button type="submit" disabled={!text.trim()}>
              <Plus className="size-4" />
              {editing ? t("Spara", "Save") : t("Lägg till", "Add")}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setText("");
                  setDate("");
                }}
              >
                {t("Avbryt", "Cancel")}
              </Button>
            )}
          </form>
          {closed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowClosed(!showClosed)}>
              {showClosed
                ? t("Dölj avslutade mål", "Hide finished goals")
                : t(`Visa avslutade mål (${closed.length})`, `Show finished goals (${closed.length})`)}
            </Button>
          )}
          {showClosed && <ul className="divide-y divide-border">{closed.map(row)}</ul>}
        </>
      )}
    </section>
  );
}
