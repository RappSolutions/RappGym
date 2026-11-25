import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { CURRENT_TERMS_VERSION, needsConsent } from "@/lib/consent";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Blocks the signed-in app until the actor has accepted the current terms version. */
export function ConsentGate({ userId, children }: { userId: string; children: ReactNode }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const q = useQuery({
    queryKey: ["user_consents", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_consents").select("terms_version").eq("user_id", userId);
      if (error) throw error;
      return data.map((r) => r.terms_version);
    },
  });
  const open = q.isSuccess && needsConsent(q.data);
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
      <Dialog open={open}>
        <DialogContent className="max-h-[90vh] overflow-y-auto [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("consent.title")}</DialogTitle>
            <DialogDescription>{t("consent.intro")}</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>{t("consent.storage")}</li>
            <li>{t("consent.identity")}</li>
            <li>{t("consent.ai")}</li>
            <li>{t("consent.cost")}</li>
            <li>{t("consent.rights")}</li>
          </ul>
          {error && <p className="text-sm text-destructive">{t("consent.error")}</p>}
          <DialogFooter>
            <Button onClick={accept} disabled={saving}>{t("consent.accept")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
