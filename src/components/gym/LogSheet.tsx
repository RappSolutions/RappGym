import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { gymsQuery, todayISO, useInvalidateGym, formatSet, doseText, type Exercise, type LogEntry } from "@/lib/gym";
import { ExerciseImages } from "./ExerciseImages";
import { LogDatePicker } from "./LogDatePicker";
import { appendLoadAdvice, splitSuggestedLoad } from "@/lib/suggested-load";

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
  onCompleted,
  progress,
}: {
  exercise: Exercise | null;
  last?: LogEntry | undefined;
  entry?: LogEntry | null;
  gymId?: string | null;
  onClose: () => void;
  onCompleted?: (() => void) | undefined;
  progress?: string | undefined;
}) {
  const { t, language, localize } = useLanguage();
  const invalidate = useInvalidateGym();
  const [round, setRound] = useState(1);
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState(10);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const { data: gyms = [] } = useQuery(gymsQuery);
  const [place, setPlace] = useState<string>("");
  const shown = exercise ? localize(exercise) : null;

  useEffect(() => {
    if (!exercise) return;
    const src = entry ?? last;
    setRound(entry?.sets ?? 1);
    const split = entry?.status === "suggested" ? splitSuggestedLoad(src?.load ?? "") : { load: src?.load ?? "", advice: "" };
    setLoad(split.load);
    setReps(src?.reps ?? 10);
    setNote(appendLoadAdvice(entry?.note ?? "", split.advice));
    setDate(entry?.date ?? todayISO());
    setPlace((entry ? entry.gym_id : gymId) ?? "");
  }, [exercise, entry, last, gymId]);

  async function save(complete = true) {
    if (!exercise) return;
    setBusy(true);
    const row = { code: exercise.code, sets: Math.max(1, round), load, reps, note: note || null, date, status: entry?.status === "suggested" && !complete ? "suggested" : "completed", ...(entry?.status === "suggested" && complete ? { created_at: new Date().toISOString() } : {}), gym_id: place || null };
    const { error } = entry
      ? await supabase.from("log_entries").update(row).eq("id", entry.id)
      : await supabase.from("log_entries").insert(row);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const code = exercise.code;
    toast.success(`${code} ${t("sparad", "saved")}${row.sets > 1 ? ` (${row.sets} ${t("set", "sets")})` : ""}`, entry ? undefined : {
      duration: 8000,
      action: {
        label: t("+1 likadant set", "+1 identical set"),
        onClick: async () => {
          const { error: e2 } = await supabase.from("log_entries").insert({ ...row, sets: 1 });
          if (e2) toast.error(e2.message);
          else { toast.success(`${code}: ${t("ett set till", "one more set")}`); invalidate(); }
        },
      },
    });
    invalidate();
    if (entry?.status === "suggested" && complete && onCompleted) onCompleted();
    else onClose();
  }

  async function remove() {
    if (!entry) return;
    if (!await confirmDialog(t("Ta bort denna rad ur loggen?", "Delete this log entry?"))) return;
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
        <div className="mx-auto max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0">
            {entry?.status === "suggested" && <p className="font-semibold text-primary">{t("Förslag", "Suggestion")}{progress ? ` · ${progress}` : ""}</p>}
            <DrawerTitle className="font-display text-2xl uppercase">
              <span className="text-primary">{shown?.code}</span> {shown?.name}
            </DrawerTitle>
            <DrawerDescription>
              {doseText(shown?.dose)}
              {last && !entry && ` · ${t("Senast", "Last")}: ${formatSet({ ...last, sets: 1 })}`}
            </DrawerDescription>
          </DrawerHeader>
          {shown && <ExerciseImages exercise={shown} />}
          <div className="grid grid-cols-2 gap-3">
            <Stepper label={t("Antal set", "Number of sets")} value={round} onChange={setRound} />
            <Stepper label={t("Reps / sek", "Reps / sec")} value={reps} onChange={setReps} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="log-load">{t("Belastning (kg / band)", "Load (kg / band)")}</Label>
              <Input id="log-load" value={load} onChange={(e) => setLoad(e.target.value)} className="h-12 text-lg font-semibold" placeholder={t("t.ex. 25 eller Orange", "e.g. 25 or Orange")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-date">{t("Datum", "Date")}</Label>
              <LogDatePicker value={date} onChange={setDate} />
            </div>
          </div>
          {gyms.length > 0 && <div className="space-y-2">
            <Label htmlFor="log-place">{t("Plats", "Location")}</Label>
            <select id="log-place" value={place} onChange={(e) => setPlace(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3">
              <option value="">{t("Ingen plats", "No location")}</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>}
          <div className="space-y-2">
            <Label htmlFor="log-note">{t("Notering & känsla", "Notes & feel")}</Label>
            <Textarea id="log-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button onClick={() => void save()} disabled={busy} className="h-14 w-full text-lg font-bold uppercase">
            {entry?.status === "suggested" ? t("Bekräfta genomfört", "Confirm completed") : entry ? t("Spara ändring", "Save changes") : t("Logga set", "Log sets")}
          </Button>
          {entry?.status === "suggested" && <Button variant="outline" disabled={busy} className="w-full" onClick={() => void save(false)}>{t("Spara justerat förslag", "Save adjusted suggestion")}</Button>}
          {entry && (
            <Button variant="ghost" disabled={busy} onClick={remove} className="w-full text-destructive">{t("Ta bort", "Delete")}</Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
