import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, useInvalidateGym, formatSet, doseText, type Exercise, type LogEntry } from "@/lib/gym";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" className="h-12 w-12 text-xl" onClick={() => onChange(Math.max(0, value - 1))}>−</Button>
        <Input inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-12 text-center text-lg font-semibold" />
        <Button type="button" variant="secondary" className="h-12 w-12 text-xl" onClick={() => onChange(value + 1)}>+</Button>
      </div>
    </div>
  );
}

export function LogSheet({
  exercise,
  last,
  entry,
  gymId,
  onClose,
}: {
  exercise: Exercise | null;
  last?: LogEntry | undefined;
  entry?: LogEntry | null;
  gymId?: string | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidateGym();
  const [round, setRound] = useState(1);
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState(10);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    const src = entry ?? last;
    setRound(entry?.sets ?? 1);
    setLoad(src?.load ?? "");
    setReps(src?.reps ?? 10);
    setNote(entry?.note ?? "");
    setDate(entry?.date ?? todayISO());
  }, [exercise, entry, last]);

  async function save() {
    if (!exercise) return;
    setBusy(true);
    const row = { code: exercise.code, sets: Math.max(1, round), load, reps, note: note || null, date, ...(entry ? {} : { gym_id: gymId ?? null }) };
    const { error } = entry
      ? await supabase.from("log_entries").update(row).eq("id", entry.id)
      : await supabase.from("log_entries").insert(row);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const code = exercise.code;
    toast.success(`${code} sparad${row.sets > 1 ? ` (${row.sets} set)` : ""}`, entry ? undefined : {
      duration: 8000,
      action: {
        label: "+1 likadant set",
        onClick: async () => {
          const { error: e2 } = await supabase.from("log_entries").insert({ ...row, sets: 1 });
          if (e2) toast.error(e2.message);
          else { toast.success(`${code}: ett set till`); invalidate(); }
        },
      },
    });
    invalidate();
    onClose();
  }

  async function remove() {
    if (!entry) return;
    const { error } = await supabase.from("log_entries").delete().eq("id", entry.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    onClose();
  }

  return (
    <Drawer open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl uppercase">
              <span className="text-primary">{exercise?.code}</span> {exercise?.name}
            </DrawerTitle>
            <DrawerDescription>
              {doseText(exercise?.dose)}
              {last && !entry && ` · Senast: ${formatSet({ ...last, sets: 1 })}`}
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Antal set" value={round} onChange={setRound} />
            <Stepper label="Reps / sek" value={reps} onChange={setReps} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Belastning (kg / band)</Label>
              <Input value={load} onChange={(e) => setLoad(e.target.value)} className="h-12 text-lg font-semibold" placeholder="t.ex. 25 eller Orange" />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notering & känsla</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button onClick={save} disabled={busy} className="h-14 w-full text-lg font-bold uppercase">
            {entry ? "Spara ändring" : "Logga set"}
          </Button>
          {entry && (
            <Button variant="ghost" onClick={remove} className="w-full text-destructive">Ta bort</Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
