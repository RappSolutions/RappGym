import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { Minus, Plus, Check, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { exercisesQuery, logQuery, todayISO, type LogEntry } from "@/lib/gym";
import { adjustLoad, circuitSteps, remainingSteps, stationSteps } from "@/lib/circuit";
import { Switch } from "@/components/ui/switch";

/** Guided workout runner: circuit (lap by lap) or station (all sets per exercise); each step logs one completed set with its actual weight. */
export function CircuitRunner({ rows, names, onClose }: { rows: LogEntry[]; names: Map<string, { name: string }>; onClose: () => void }) {
  const { t, localize } = useLanguage();
  const qc = useQueryClient();
  const { data: allExercises = [] } = useQuery(exercisesQuery);
  const { data: log = [] } = useQuery(logQuery);
  const proposalId = rows[0]?.proposal_id ?? null;
  // Snapshot of sets already completed for this workout when the runner opened, so Continue resumes where you were.
  const [prior] = useState(() => proposalId ? log.filter((e) => e.proposal_id === proposalId && e.status === "completed") : []);
  const doneByCode = useMemo(() => { const m = new Map<string, number>(); for (const e of prior) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets ?? 1)); return m; }, [prior]);
  const ordered = useMemo(() => [...rows].sort((a, b) => (a.proposal_order ?? 0) - (b.proposal_order ?? 0)), [rows]);
  const [circuit, setCircuit] = useState(true);
  const allSteps = useMemo(() => (circuit ? circuitSteps(ordered) : stationSteps(ordered)), [ordered, circuit]);
  const steps = useMemo(() => remainingSteps(allSteps, doneByCode), [allSteps, doneByCode]);
  const total = allSteps.length;
  const before = total - steps.length;
  const laps = Math.max(0, ...allSteps.map((s) => s.lap));
  const [i, setI] = useState(0);
  const [loads, setLoads] = useState(() => new Map(ordered.map((r) => { const lastDone = prior.find((e) => e.code === r.code); return [r.id, lastDone?.load ?? r.load ?? ""]; })));
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
      if (i + 1 >= steps.length) await finish(count + prior.length);
      else setI(i + 1);
    } catch { toast.error(t("Kunde inte spara. Försök igen.", "Could not save. Try again.")); }
    finally { setBusy(false); }
  }

  const r = step?.row;
  const load = r ? loads.get(r.id) ?? "" : "";
  const setLoad = (v: string) => r && setLoads((m) => new Map(m).set(r.id, v));
  const rep = r ? reps.get(r.id) ?? 10 : 10;
  const rawEx = r ? allExercises.find((e) => e.code === r.code) : undefined;
  const ex = rawEx ? localize(rawEx) : undefined;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) void finish(0); }}>
      <DialogContent className="max-h-[95dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{circuit ? t(`Varv ${step?.lap ?? laps} av ${laps}`, `Lap ${step?.lap ?? laps} of ${laps}`) : t(`Set ${step?.lap ?? 1} av ${step?.row.sets ?? 1}`, `Set ${step?.lap ?? 1} of ${step?.row.sets ?? 1}`)} · {t(`Steg ${before + i + 1} av ${total}`, `Step ${before + i + 1} of ${total}`)}</DialogTitle>
          <DialogDescription>{t(`${prior.length + done} set loggade`, `${prior.length + done} sets logged`)}</DialogDescription>
          <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${total ? ((before + i) / total) * 100 : 0}%` }} /></div>
        </DialogHeader>
        <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"><span><span className="block font-medium">{t("Kör som cirkel", "Run as circuit")}</span><span className="block text-xs text-muted-foreground">{circuit ? t("Ett set per övning, varv för varv", "One set per exercise, lap by lap") : t("Alla set på en övning innan nästa", "All sets of one exercise before the next")}</span></span><Switch checked={circuit} disabled={i > 0 || prior.length > 0 || busy} onCheckedChange={setCircuit} /></label>
        {r && <div className="space-y-4">
          <div><p className="font-bold text-primary">{r.code}</p><p className="text-xl font-bold">{ex?.name ?? names.get(r.code)?.name ?? r.code}</p>{(ex?.variant || ex?.muscles) && <p className="text-sm text-muted-foreground">{[ex?.variant, ex?.muscles].filter(Boolean).join(" · ")}</p>}{r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}</div>
          {ex && <ExerciseImages exercise={ex} />}
          {ex?.instructions && <p className="text-sm leading-relaxed">{ex.instructions}</p>}
          {ex?.focus && <p className="border-l-4 border-primary pl-3 text-sm"><b>{t("Fokus:", "Focus:")}</b> {ex.focus}</p>}
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
