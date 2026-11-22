import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { useUserView } from "@/lib/user-view";
import { emptyExerciseSuggestion, exerciseSuggestionSchema, suggestionLookupsQuery } from "@/lib/exercise-suggestions";
import { sendExerciseSuggestion } from "@/lib/exercise-suggestions.functions";
import { useExerciseTitle } from "@/hooks/use-exercise-title";
import { exerciseNameUrl, preserveExerciseLink } from "@/lib/exercise-title";

export function ExerciseSuggestionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage();
  const { readOnly } = useUserView();
  const [form, setForm] = useState({ ...emptyExerciseSuggestion });
  const [busy, setBusy] = useState(false);
  const titleLookup = useExerciseTitle(open, "suggestion");
  function lookupName(value: string) {
    const url = exerciseNameUrl(value);
    if (url) setForm((cur) => ({ ...cur, instructions: preserveExerciseLink(cur.instructions, url), source_url: cur.source_url || url }));
    void titleLookup.lookup(value, (name, url) => setForm((cur) => cur.name.trim() === value.trim()
      ? { ...cur, name, instructions: preserveExerciseLink(cur.instructions, url), source_url: cur.source_url || url } : cur));
  }
  const { data: lookups, isPending, isError } = useQuery({ ...suggestionLookupsQuery, enabled: open });
  const send = useServerFn(sendExerciseSuggestion);
  const valid = exerciseSuggestionSchema.safeParse(form).success;
  async function submit() {
    if (busy || readOnly || titleLookup.loading || exerciseNameUrl(form.name)) return;
    const parsed = exerciseSuggestionSchema.safeParse(form);
    if (!parsed.success) return;
    setBusy(true);
    try {
      const result = await send({ data: parsed.data });
      if (result.delivered) toast.success(t("exerciseSuggestion.sent"));
      else toast.warning(t("exerciseSuggestion.savedNotSent"));
      setForm({ ...emptyExerciseSuggestion }); onOpenChange(false);
    } catch { toast.error(t("contact.failed")); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5">
      <DialogHeader><DialogTitle>{t("exerciseSuggestion.title")}</DialogTitle><DialogDescription>{t("exerciseSuggestion.description")}</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="space-y-1"><Label htmlFor="suggestion-name">{t("exerciseForm.nameOrUrl")}</Label><div className="relative"><Input id="suggestion-name" className="pr-9" required maxLength={2000} value={form.name} aria-busy={titleLookup.loading} disabled={busy || readOnly} onChange={(event) => { titleLookup.cancel(); setForm({ ...form, name: event.target.value }); }} onPaste={(event) => { const value = event.clipboardData.getData("text").trim(); if (exerciseNameUrl(value)) { event.preventDefault(); setForm((cur) => ({ ...cur, name: value })); lookupName(value); } }} onBlur={() => { if (!titleLookup.loading) lookupName(form.name); }} />{titleLookup.loading && <LoaderCircle aria-label={t("exerciseForm.fetchingTitle")} className="pointer-events-none absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />}</div></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(["category_id", "equipment_id"] as const).map((field) => <div key={field} className="space-y-1">
          <Label htmlFor={`suggestion-${field}`}>{t(field === "category_id" ? "exerciseSuggestion.category" : "exerciseSuggestion.equipment")}</Label>
          <select id={`suggestion-${field}`} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={form[field] ?? ""} disabled={busy || readOnly || isPending || isError} onChange={(event) => setForm({ ...form, [field]: event.target.value || null })}>
            <option value="">{t("exerciseSuggestion.unspecified")}</option>{(field === "category_id" ? lookups?.categories : lookups?.equipment)?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>)}</div>
        {isError && <p className="text-sm text-destructive">{t("exerciseSuggestion.lookupFailed")}</p>}
        <div className="space-y-1"><Label htmlFor="suggestion-instructions">{t("exerciseSuggestion.instructions")}</Label><Textarea id="suggestion-instructions" required rows={5} maxLength={4000} value={form.instructions} disabled={busy || readOnly} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="suggestion-url">{t("exerciseSuggestion.link")}</Label><Input id="suggestion-url" type="url" maxLength={2000} value={form.source_url} disabled={busy || readOnly} onChange={(event) => setForm({ ...form, source_url: event.target.value })} /></div>
        <p className="text-xs text-muted-foreground">{t("exerciseSuggestion.accountNote")}</p>
        <div className="flex justify-end"><Button type="submit" variant="secondary" disabled={busy || readOnly || !valid || titleLookup.loading || !!exerciseNameUrl(form.name)}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{t("exerciseSuggestion.send")}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}