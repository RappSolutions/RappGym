import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Check, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { todayISO, type LogEntry } from "@/lib/gym";
import { adjustLoad, circuitSteps } from "@/lib/circuit";

/** Guided circuit: each lap logs one completed set per exercise with its own actual weight. */
export function CircuitRunner({ rows, names, onClose }: { rows: LogEntry[]; names: Map<string, { name: string }>; onClose: () => void }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const ordered = useMemo(() => [...rows].sort((a, b) => (a.proposal_order ?? 0) - (b.proposal_order ?? 0)), [rows]);
  const steps = useMemo(() => circuitSteps(ordered), [ordered]);
  const laps = steps.at(-1)?.lap ?? 0;
  const [i, setI] = useState(0);
  const [loads, setLoads] = useState(() => new Map(ordered.map((r) => [r.id, r.load ?? ""])));
  const [reps, setReps] = useState(() => new Map(ordered.map((r) => [r.id, r.reps ?? 10])));
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = steps[i];

  async function finish(count: number) {
    if (count > 0) {
      const ids = ordered.map((r) => r.id);
      await supabase.from("log_entries").delete().in("id", ids).eq("status", "suggested");
      toast.success(t(`Passet klart – ${count} set loggade`, `Workout done – ${count} sets logged`));
    }
    await Promise.all([qc.invalidateQueries({ queryKey: ["log"] }), qc.invalidateQueries({ queryKey: ["workout-suggestions"] }), qc.invalidateQueries({ queryKey: ["accepted-ai-workouts"] })]);
    onClose();
  }

  async function next(log: boolean) {
    if (!step || busy) return;
    setBusy(true);
    let count = done;
    try {
      if (log) {
        const r = step.row;
        const { error } = await supabase.from("log_entries").insert({ code: r.code, sets: 1, reps: reps.get(r.id) ?? null, load: loads.get(r.id) ?? "", date: todayISO(), gym_id: r.gym_id, status: "completed", proposal_id: r.proposal_id, proposal_title: r.proposal_title, note: step.lap === 1 ? r.note : null });
        if (error) throw error;
        count += 1;
        setDone(count);
      }
      if (i + 1 >= steps.length) await finish(count);
      else setI(i + 1);
    } catch { toast.error(t("Kunde inte spara. Försök igen.", "Could not save. Try again.")); }
    finally { setBusy(false); }
  }

  const r = step?.row;
  const load = r ? loads.get(r.id) ?? "" : "";
  const setLoad = (v: string) => r && setLoads((m) => new Map(m).set(r.id, v));
  const rep = r ? reps.get(r.id) ?? 10 : 10;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) void finish(0); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("Varv", "Lap")} {step?.lap ?? laps}/{laps}</DialogTitle>
          <DialogDescription>{t(`Steg ${i + 1} av ${steps.length} · ${done} set loggade`, `Step ${i + 1} of ${steps.length} · ${done} sets logged`)}</DialogDescription>
        </DialogHeader>
        {r && <div className="space-y-4">
          <div><p className="font-bold text-primary">{r.code}</p><p className="text-xl font-bold">{names.get(r.code)?.name ?? r.code}</p>{r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}</div>
          <div className="space-y-1"><p className="text-sm font-medium">{t("Vikt (kg)", "Weight (kg)")}</p>
            <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="size-12" aria-label="-2.5 kg" onClick={() => setLoad(adjustLoad(load, -2.5))}><Minus /></Button><Input inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} className="h-12 text-center text-xl font-bold" /><Button variant="outline" size="icon" className="size-12" aria-label="+2.5 kg" onClick={() => setLoad(adjustLoad(load, 2.5))}><Plus /></Button></div></div>
          <div className="space-y-1"><p className="text-sm font-medium">{t("Reps", "Reps")}</p>
            <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="size-12" aria-label="-1" onClick={() => r && setReps((m) => new Map(m).set(r.id, Math.max(0, rep - 1)))}><Minus /></Button><Input inputMode="numeric" value={rep} onChange={(e) => r && setReps((m) => new Map(m).set(r.id, Number(e.target.value) || 0))} className="h-12 text-center text-xl font-bold" /><Button variant="outline" size="icon" className="size-12" aria-label="+1" onClick={() => r && setReps((m) => new Map(m).set(r.id, rep + 1))}><Plus /></Button></div></div>
          <p className="text-xs text-muted-foreground">{t("Vikten du väljer följer med till nästa varv.", "The weight you choose carries over to the next lap.")}</p>
          <div className="flex gap-2"><Button variant="ghost" disabled={busy} onClick={() => void next(false)}><SkipForward className="size-4" />{t("Hoppa över", "Skip")}</Button><Button className="h-12 flex-1 text-lg" disabled={busy} onClick={() => void next(true)}><Check />{t("Klar", "Done")}</Button></div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => void finish(done)}>{t("Avsluta passet nu", "End workout now")}</Button>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
