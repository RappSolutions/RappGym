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
  const { t, lang } = useLanguage();
  const scan = useServerFn(scanLocationPhoto);
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    const src = image ?? url.trim();
    if (!src) return;
    setBusy(true);
    try {
      const res = await scan({ data: { gymId, image: src, language: lang } });
      if (res.error) { toast.error(res.error); return; }
      if (!res.exerciseIds.length) { toast.error(t("AI hittade inga övningar som passar bilden.", "AI found no matching exercises in the photo.")); return; }
      if (!confirm(t(`AI ser: ${res.equipment}\n\nSätt ${res.exerciseIds.length} övningar för platsen? Övriga kopplingar tas bort.`, `AI sees: ${res.equipment}\n\nSet ${res.exerciseIds.length} exercises for this location? Other links are removed.`))) return;
      await onApply(res.exerciseIds, res.equipment);
      setImage(null); setUrl("");
      toast.success(t("Övningar uppdaterade från bilden.", "Exercises updated from the photo."));
    } catch {
      toast.error(t("Bilden kunde inte analyseras.", "The photo could not be analysed."));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />{t("Koppla övningar från en bild med AI", "Match exercises from a photo with AI")}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input value={url} disabled={busy || !!image} onChange={(e) => setUrl(e.target.value)} placeholder={t("Klistra in bildadress (https://…jpg)", "Paste image address (https://…jpg)")} />
        <Button asChild variant="outline" disabled={busy}>
          <label className="cursor-pointer"><Camera />{image ? t("Bild vald", "Photo chosen") : t("Ladda upp", "Upload")}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await fileToDataUrl(f)); }} />
          </label>
        </Button>
      </div>
      {image && <img src={image} alt="" className="max-h-40 rounded" />}
      <Button size="sm" disabled={busy || (!image && !url.trim())} onClick={() => void run()}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? t("Analyserar…", "Analysing…") : t("Analysera bilden", "Analyse photo")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("Körs bara när du trycker (cirka 1 AI-krediter).", "Runs only when you press it (about 1 AI credit).")}</p>
    </div>
  );
}
