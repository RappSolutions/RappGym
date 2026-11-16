import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { todayISO, type Exercise, type LogEntry } from "@/lib/gym";

/** Quick builder for an own planned workout, stored like AI plans (suggested rows) so it can be run as a circuit. */
export function WorkoutBuilder({ exercises, last, gymId }: { exercises: Exercise[]; last: Map<string, LogEntry>; gymId: string }) {
  const { t, localize } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [laps, setLaps] = useState(3);
  const [reps, setReps] = useState(12);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!picked.length || busy) return;
    setBusy(true);
    const proposalId = crypto.randomUUID();
    const rows = picked.map((code, index) => ({ code, sets: Math.max(1, laps), reps, load: last.get(code)?.load ?? "", date: todayISO(), gym_id: gymId, status: "suggested", proposal_id: proposalId, proposal_title: title.trim() || t("Eget pass", "Own workout"), proposal_order: index }));
    const { error } = await supabase.from("log_entries").insert(rows);
    setBusy(false);
    if (error) { toast.error(t("Kunde inte spara passet.", "Could not save the workout.")); return; }
    await qc.invalidateQueries({ queryKey: ["workout-suggestions"] });
    toast.success(t("Passet är planerat", "Workout planned"));
    setOpen(false); setPicked([]); setTitle("");
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><ListPlus className="size-4" />{t("Skapa eget pass", "Create own workout")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>{t("Skapa eget pass", "Create own workout")}</DialogTitle><DialogDescription>{t("Välj övningar i den ordning du vill köra dem. Vikten förifylls från senaste gången.", "Pick exercises in the order you want to do them. Weight is prefilled from last time.")}</DialogDescription></DialogHeader>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Namn (valfritt)", "Name (optional)")} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">{t("Varv", "Laps")}<Input type="number" min={1} value={laps} onChange={(e) => setLaps(Number(e.target.value) || 1)} /></label>
            <label className="text-sm">{t("Reps", "Reps")}<Input type="number" min={1} value={reps} onChange={(e) => setReps(Number(e.target.value) || 1)} /></label>
          </div>
          <div className="divide-y rounded-lg border">
            {exercises.map((ex) => { const l = localize(ex); const n = picked.indexOf(ex.code); return (
              <label key={ex.id} className="flex cursor-pointer items-center gap-3 px-3 py-2">
                <input type="checkbox" className="size-4" checked={n >= 0} onChange={() => setPicked((p) => n >= 0 ? p.filter((c) => c !== ex.code) : [...p, ex.code])} />
                <span className="w-10 font-bold">{l.code}</span><span className="flex-1 truncate">{l.name}</span>{n >= 0 && <span className="text-sm font-bold text-primary">#{n + 1}</span>}
              </label>); })}
          </div>
          <Button disabled={!picked.length || busy} onClick={() => void save()}>{t(`Planera pass (${picked.length} övningar)`, `Plan workout (${picked.length} exercises)`)}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
