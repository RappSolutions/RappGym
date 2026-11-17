import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, LoaderCircle, Sparkles, Trash2, Link as LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { exercisesQuery, useInvalidateGym, type Exercise } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import { ExerciseImage, imageUrlsOf } from "@/components/gym/ExerciseImages";
import { generateExerciseImage } from "@/lib/exercise-image.functions";

/** Add, generate (AI on explicit click) and remove pictures of one exercise; each change saves immediately. */
export function ExerciseImageEditor({ exercise }: { exercise: Exercise }) {
  const { t } = useLanguage();
  const invalidate = useInvalidateGym();
  const { data: all = [] } = useQuery(exercisesQuery);
  const live = all.find((e) => e.id === exercise.id) ?? exercise;
  const urls = imageUrlsOf(live);
  const [url, setUrl] = useState("");
  const [wishes, setWishes] = useState("");
  const [busy, setBusy] = useState<"ai" | "upload" | null>(null);
  const generate = useServerFn(generateExerciseImage);

  async function saveUrls(next: string[]) {
    const { error } = await supabase.from("exercises").update({ image_urls: next }).eq("id", exercise.id);
    if (error) { toast.error(error.message); return false; }
    invalidate();
    return true;
  }
  async function upload(file: File) {
    setBusy("upload");
    const { data: user } = await supabase.auth.getUser();
    const path = `${user.user?.id}/${exercise.id}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("exercise-images").upload(path, file, { contentType: file.type });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    await saveUrls([...urls, `storage:${path}`]);
  }
  async function addUrl() {
    if (!/^https:\/\//i.test(url.trim())) { toast.error(t("Länken måste börja med https://", "The link must start with https://")); return; }
    if (await saveUrls([...urls, url.trim()])) setUrl("");
  }
  async function ai() {
    setBusy("ai");
    try {
      const res = await generate({ data: { exerciseId: exercise.id, wishes } });
      if (res.error || !res.path) toast.error(res.error ?? "AI error");
      else { await saveUrls([...urls, res.path]); toast.success(t("Ny bild skapad", "New picture created")); }
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    setBusy(null);
  }
  async function remove(u: string) {
    if (!await confirmDialog(t("Ta bort bilden?", "Remove this picture?"))) return;
    if (!(await saveUrls(urls.filter((x) => x !== u)))) return;
    if (u.startsWith("storage:")) await supabase.storage.from("exercise-images").remove([u.slice(8)]);
  }

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{t("Bilder", "Pictures")}</legend>
      {urls.length === 0 && <p className="text-sm text-muted-foreground">{t("Inga bilder ännu.", "No pictures yet.")}</p>}
      <div className="grid gap-2 sm:grid-cols-2">{urls.map((u) => (
        <div key={u} className="relative">
          <ExerciseImage url={u} alt={exercise.name} className="w-full rounded-md border" />
          <Button type="button" size="icon" variant="destructive" className="absolute right-1 top-1 size-9" aria-label={t("Ta bort bild", "Remove picture")} onClick={() => void remove(u)}><Trash2 /></Button>
        </div>))}
      </div>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/bild.jpg" aria-label={t("Bildlänk", "Picture link")} />
        <Button type="button" variant="outline" onClick={() => void addUrl()} disabled={!url.trim()}><LinkIcon />{t("Lägg till", "Add")}</Button>
      </div>
      <Label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium hover:bg-accent">
        {busy === "upload" ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{t("Ladda upp från datorn/telefonen", "Upload from computer/phone")}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
      </Label>
      <p className="text-xs text-muted-foreground">{t("Bilder i övningsbanken blir synliga för alla inloggade användare.", "Pictures in the exercise bank are visible to all signed-in users.")}</p>
      <div className="space-y-1">
        <Label>{t("Önskemål till AI-bilden (valfritt)", "Wishes for the AI picture (optional)")}</Label>
        <Textarea rows={2} value={wishes} onChange={(e) => setWishes(e.target.value)} placeholder={t("T.ex. visa från sidan, kvinna, gummiband i gult", "E.g. side view, female figure, yellow band")} />
        <Button type="button" className="w-full" disabled={busy !== null} onClick={() => void ai()}>{busy === "ai" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy === "ai" ? t("Skapar bild… (kan ta en minut)", "Creating picture… (may take a minute)") : t("Skapa bild med AI", "Create picture with AI")}</Button>
      </div>
    </fieldset>
  );
}
