import { useUserView } from "@/lib/user-view";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { todayISO, type Exercise, type LogEntry } from "@/lib/gym";
import { createSpontaneousWorkout } from "@/lib/spontaneous-workout";
import { useStartWorkout } from "@/components/gym/ActiveWorkout";

/** Starts an empty workout today; exercises are added one by one while training. */
export function SpontaneousButton({ gymId, size = "default", exercise, last, onStarted }: { gymId: string; size?: "default" | "lg"; exercise?: Exercise; last?: LogEntry | undefined; onStarted?: () => void }) {
  const { t } = useLanguage();
  const { readOnly } = useUserView();
  const startWorkout = useStartWorkout();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  async function start() {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      const id = await createSpontaneousWorkout(gymId, `${t("spontaneousButton.spontaneousWorkout")} ${todayISO()}`, exercise, last);
      await qc.invalidateQueries({ queryKey: ["workout-suggestions"] });
      onStarted?.();
      startWorkout(id);
    } catch {
      toast.error(t("spontaneousButton.couldNotStartTheWorkout"));
    } finally { setBusy(false); }
  }
  return (
    <>
      <Button variant="secondary" size={size} className="w-full px-4" disabled={readOnly || busy} onClick={() => void start()}>{exercise ? <Play className="size-4" /> : <Zap className="size-4" />}{exercise ? t("exercisesDetail.startSpontaneous") : t("spontaneousButton.spontaneous")}</Button>
    </>
  );
}
