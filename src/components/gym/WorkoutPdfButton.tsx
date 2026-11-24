import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { imageUrlsOf } from "@/components/gym/ExerciseImages";
import { downloadWorkoutPdf, loadPdfImages, type PrintRow } from "@/lib/workout-export";

type Ex = Parameters<typeof downloadWorkoutPdf>[2][number] & { image_urls?: unknown };
const KEY = "rappgym.pdfImages";

async function resolve(url: string) {
  if (!url.startsWith("storage:")) return url;
  const { data } = await supabase.storage.from("exercise-images").createSignedUrl(url.slice(8), 600);
  return data?.signedUrl ?? null;
}

export function WorkoutPdfButton({ title, date, gym, rows, exercises }: { title: string; date: string; gym?: string | undefined; rows: readonly PrintRow[]; exercises: readonly Ex[] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [withImages, setWithImages] = useState(false);
  const [images, setImages] = useState<Awaited<ReturnType<typeof loadPdfImages>> | null>(null);
  useEffect(() => { setWithImages(localStorage.getItem(KEY) === "1"); }, []);
  useEffect(() => {
    if (!open || !withImages || images) return;
    let live = true;
    void (async () => {
      const ids = new Set(rows.map((r) => r.exercise_id));
      const src = new Map<string, string>();
      await Promise.all(exercises.filter((e) => ids.has(e.id)).map(async (e) => {
        const u = imageUrlsOf(e as never)[0]; const s = u ? await resolve(u) : null; if (s) src.set(e.id, s);
      }));
      const loaded = await loadPdfImages(src);
      if (live) setImages(loaded);
    })();
    return () => { live = false; };
  }, [open, withImages, images, rows, exercises]);
  const loading = withImages && !images;
  const download = () => {
    try {
      downloadWorkoutPdf({ title, date, gym, labels: { lap: t("plannedWorkouts.printLap"), note: t("plannedWorkouts.printNote"), phases: { intro: t("phase.intro"), main: t("phase.main"), outro: t("phase.outro") } } }, rows, exercises, withImages ? images ?? undefined : undefined);
      setOpen(false);
    } catch { toast.error(t("plannedWorkouts.printBlocked")); }
  };
  return (
    <>
      <Button variant="ghost" size="icon" className="mt-1 shrink-0 text-muted-foreground" title={t("plannedWorkouts.print")} aria-label={`${t("plannedWorkouts.print")}: ${title}`} onClick={() => setOpen(true)}><FileDown className="size-4" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("plannedWorkouts.printTitle")}</DialogTitle></DialogHeader>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t("plannedWorkouts.printImages")}
            <Switch checked={withImages} onCheckedChange={(v) => { setWithImages(v); localStorage.setItem(KEY, v ? "1" : "0"); }} />
          </label>
          <Button variant="outline" disabled={loading} onClick={download}><FileDown className="size-4" />{loading ? t("plannedWorkouts.printLoading") : t("plannedWorkouts.print")}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
