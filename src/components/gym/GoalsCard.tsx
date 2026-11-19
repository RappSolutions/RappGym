import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Flag, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const label: Record<GoalStatus, string> = {
    active: t("goalsCard.active"),
    fulfilled: t("goalsCard.fulfilled"),
    partly: t("goalsCard.partlyAchieved"),
    postponed: t("goalsCard.postponed"),
    nevermind: t("goalsCard.neverMind"),
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
              {t("goalsCard.by")} {formatDate(g.target_date)} ·{" "}
            </>
          )}
          {t("goalsCard.created")} {formatDate(g.created_at.slice(0, 10))}
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
          aria-label={t("common.reactivate")}
          title={t("common.reactivate")}
          onClick={() => void setStatus(g, "active")}
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={t("goalsCard.finalizeGoal")}>
            <Flag className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["fulfilled", "partly", "postponed", "nevermind", "active"] as const)
            .filter((s) => s !== g.status)
            .map((s) => (
              <DropdownMenuItem key={s} className="min-h-11" onSelect={() => void setStatus(g, s)}>
                {s === "active" ? t("common.reactivate") : label[s]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="icon" variant="ghost" aria-label={t("common.edit")} onClick={() => edit(g)}>
        <Pencil className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t("common.delete")}
        onClick={async () => {
          if (await confirmDialog(t("goalsCard.deleteTheGoal", { text: g.text })))
            void run(supabase.from("training_goals").delete().eq("id", g.id));
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );

  return (
    <section className="space-y-4 border-t pt-3" aria-label={t("goalsCard.myGoals")}>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-0"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}

        <span className="inline-flex items-center gap-2 font-display text-xl font-bold">
          <Target className="size-5 text-primary" />
          {t("goalsCard.myGoals")}
        </span>
      </Button>
      {expanded && (
        <>
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
              placeholder={t("goalsCard.newGoal")}
              aria-label={t("goalsCard.goal")}
            />
            <Input
              className="w-40"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label={t("goalsCard.targetDateOptional")}
            />
            <Button type="submit" disabled={!text.trim()}>
              <Plus className="size-4" />
              {editing ? t("common.save") : t("common.add")}
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
                {t("common.cancel")}
              </Button>
            )}
          </form>
          <p className="text-sm text-muted-foreground">
            {t("goalsCard.theseGoalsAndYourProfile")}
          </p>
          {closed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowClosed(!showClosed)}>
              {showClosed
                ? t("goalsCard.hideFinishedGoals")
                : t("goalsCard.showFinishedGoals", { length: closed.length })}
            </Button>
          )}
          {showClosed && <ul className="divide-y divide-border">{closed.map(row)}</ul>}
        </>
      )}
    </section>
  );
}
