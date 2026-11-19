import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { scanLocationPhoto } from "@/lib/location-scan.functions";

async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function LocationPhotoScan({ gymId, onApply }: { gymId: string; onApply: (ids: string[], equipment: string) => Promise<void> }) {
  const { t, language } = useLanguage();
  const scan = useServerFn(scanLocationPhoto);
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    const src = image ?? url.trim();
    if (!src) return;
    setBusy(true);
    try {
      const res = await scan({ data: { gymId, image: src, language } });
      if (res.error) { toast.error(res.error); return; }
      if (!res.exerciseIds.length) { toast.error(t("locationPhotoScan.aiFoundNoMatchingExercises")); return; }
      if (!await confirmDialog(t("locationPhotoScan.aiSeesSetExercisesFor", { equipment: res.equipment, length: res.exerciseIds.length }))) return;
      await onApply(res.exerciseIds, res.equipment);
      setImage(null); setUrl("");
      toast.success(t("locationPhotoScan.exercisesUpdatedFromThePhoto"));
    } catch {
      toast.error(t("locationPhotoScan.thePhotoCouldNotBe"));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />{t("locationPhotoScan.matchExercisesFromAPhoto")}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input value={url} disabled={busy || !!image} onChange={(e) => setUrl(e.target.value)} placeholder={t("locationPhotoScan.pasteImageAddressHttpsJpg")} />
        <Button asChild variant="outline" disabled={busy}>
          <label className="cursor-pointer"><Camera />{image ? t("locationPhotoScan.photoChosen") : t("locationPhotoScan.upload")}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await fileToDataUrl(f)); }} />
          </label>
        </Button>
      </div>
      {image && <img src={image} alt="" className="max-h-40 rounded" />}
      <Button size="sm" disabled={busy || (!image && !url.trim())} onClick={() => void run()}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? t("locationPhotoScan.analysing") : t("locationPhotoScan.analysePhoto")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("locationPhotoScan.runsOnlyWhenYouPress")}</p>
    </div>
  );
}
