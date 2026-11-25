import { useState, type ReactNode } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { CURRENT_TERMS_VERSION, consentPrompt, latestConsent, type ConsentRow } from "@/lib/consent";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConsentPoints } from "@/components/gym/ConsentPoints";

export const consentsQuery = (userId: string) => queryOptions({
  queryKey: ["user_consents", userId],
  queryFn: async (): Promise<ConsentRow[]> => {
    const { data, error } = await supabase.from("user_consents").select("terms_version, consented_at").eq("user_id", userId);
    if (error) throw error;
    return data;
  },
});

type Mode = "first" | "update" | "view";

/** Shared consent dialog: blocking for first/update, closable when opened manually. */
export function ConsentDialog({ mode, open, rows, onAccept, onOpenChange, saving, error }: {
  mode: Mode; open: boolean; rows: readonly ConsentRow[];
  onAccept?: () => void; onOpenChange?: (open: boolean) => void; saving?: boolean; error?: boolean;
}) {
  const { t } = useLanguage();
  const blocking = mode !== "view";
  const latest = latestConsent(rows);
  const title = mode === "first" ? t("consent.titleFirst") : mode === "update" ? t("consent.titleUpdate", { version: CURRENT_TERMS_VERSION }) : t("consent.title");
  const intro = mode === "first" ? t("consent.introFirst") : mode === "update" ? t("consent.introUpdate", { version: latest?.terms_version ?? 0 }) : t("consent.introView");
  return (
    <Dialog open={open} {...(!blocking && onOpenChange ? { onOpenChange } : {})}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${blocking ? "[&>button]:hidden" : ""}`}
        {...(blocking ? { onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(), onPointerDownOutside: (e: Event) => e.preventDefault() } : {})}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{intro}</DialogDescription>
        </DialogHeader>
        {mode === "view" && (
          <p className="rounded-md border px-3 py-2 text-sm" data-testid="consent-status">
            {latest ? t("consent.acceptedStatus", { version: latest.terms_version, date: latest.consented_at.slice(0, 10) }) : t("consent.notAccepted")}
          </p>
        )}
        <ConsentPoints />
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">{t("consent.policyLink")}</a>
        {error && <p className="text-sm text-destructive">{t("consent.error")}</p>}
        <DialogFooter>
          {blocking
            ? <Button onClick={onAccept} disabled={saving}>{mode === "first" ? t("consent.acceptFirst") : t("consent.acceptUpdate")}</Button>
            : <Button variant="outline" onClick={() => onOpenChange?.(false)}>{t("consent.close")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Blocks the signed-in app until the actor has accepted the current terms version. */
export function ConsentGate({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const q = useQuery(consentsQuery(userId));
  const prompt = q.isSuccess ? consentPrompt(q.data.map((r) => r.terms_version)) : null;
  async function accept() {
    setSaving(true);
    setError(false);
    const { error } = await supabase.from("user_consents").insert({ user_id: userId, terms_version: CURRENT_TERMS_VERSION });
    setSaving(false);
    if (error && error.code !== "23505") return setError(true);
    await qc.invalidateQueries({ queryKey: ["user_consents", userId] });
  }
  return (
    <>
      {children}
      {prompt && <ConsentDialog mode={prompt} open rows={q.data ?? []} onAccept={accept} saving={saving} error={error} />}
    </>
  );
}

/** Manually opened, closable consent view (avatar menu). */
export function ConsentViewDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const q = useQuery({ ...consentsQuery(userId), enabled: open });
  return <ConsentDialog mode="view" open={open} rows={q.data ?? []} onOpenChange={onOpenChange} />;
}
