import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LoaderCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { sendSupportMessage } from "@/lib/support.functions";
import { ExerciseSuggestionForm } from "@/components/gym/ExerciseSuggestionDialog";

const KINDS = ["question", "feedback", "bug", "exercise"] as const;

export function ContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  const send = useServerFn(sendSupportMessage);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("question");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const submit = async () => {
    if (kind === "exercise" || !message.trim()) return;
    setBusy(true);
    try {
      const result = await send({ data: { kind, message } });
      if (result.delivered) toast.success(t("contact.sent"));
      else toast.warning(t("contact.savedNotSent"));
      setMessage(""); onOpenChange(false);
    } catch { toast.error(t("contact.failed")); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy && !formBusy) onOpenChange(v); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5">
        <DialogHeader><DialogTitle>{t("contact.title")}</DialogTitle><DialogDescription>{t("contact.description")}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("contact.kind")}>
            {KINDS.map((k) => <Button key={k} type="button" size="sm" variant={kind === k ? "secondary" : "ghost"} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{t(`contact.kinds.${k}`)}</Button>)}
          </div>
          {kind === "exercise" ? <ExerciseSuggestionForm open={open} onDone={() => onOpenChange(false)} onBusyChange={setFormBusy} /> : <>
          <div className="space-y-1"><Label htmlFor="contact-msg">{t("contact.message")}</Label><Textarea id="contact-msg" rows={6} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">{t("contact.diagnosticsNote")}</p>
          <div className="flex justify-end"><Button onClick={() => void submit()} disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{t("contact.send")}</Button></div>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
