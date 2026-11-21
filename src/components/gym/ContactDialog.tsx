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

const KINDS = ["question", "feedback", "bug"] as const;

export function ContactDialog({ open, onOpenChange, gymName }: { open: boolean; onOpenChange: (v: boolean) => void; gymName: string }) {
  const { t, language } = useLanguage();
  const send = useServerFn(sendSupportMessage);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("question");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await send({ data: { kind, message, client: { userAgent: navigator.userAgent.slice(0, 500), viewport: `${window.innerWidth}x${window.innerHeight}`, language: String(language).slice(0, 10), path: window.location.pathname.slice(0, 200), gymName: gymName.slice(0, 200) } } });
      toast.success(t("contact.sent"));
      setMessage(""); onOpenChange(false);
    } catch { toast.error(t("contact.failed")); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="w-[calc(100%-2rem)] p-5">
        <DialogHeader><DialogTitle>{t("contact.title")}</DialogTitle><DialogDescription>{t("contact.description")}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1" role="radiogroup" aria-label={t("contact.kind")}>
            {KINDS.map((k) => <Button key={k} type="button" size="sm" variant={kind === k ? "secondary" : "ghost"} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{t(`contact.kinds.${k}`)}</Button>)}
          </div>
          <div className="space-y-1"><Label htmlFor="contact-msg">{t("contact.message")}</Label><Textarea id="contact-msg" rows={6} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">{t("contact.diagnosticsNote")}</p>
          <div className="flex justify-end"><Button onClick={() => void submit()} disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{t("contact.send")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
