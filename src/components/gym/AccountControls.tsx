import { AvatarSettings } from "@/components/gym/AvatarSettings";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { deleteMyAccount } from "@/lib/account.functions";
import { getBillingStatus, startCheckout, openBillingPortal } from "@/lib/billing.functions";
import { membershipActive } from "@/lib/account-policy";
export function AccountControls({
  userId,
  open,
  onOpenChange,
  onDeleted,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const status = useServerFn(getBillingStatus);
  const checkout = useServerFn(startCheckout);
  const portal = useServerFn(openBillingPortal);
  const remove = useServerFn(deleteMyAccount);
  const qc = useQueryClient();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: membership } = useQuery({
    queryKey: ["my-membership", userId],
    enabled: open,
    queryFn: async () => {
      const r = await supabase
        .from("user_memberships")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const { data: billing } = useQuery({
    queryKey: ["billing-status", userId],
    enabled: open,
    queryFn: () => status(),
  });
  const active =
    membership &&
    membershipActive(
      membership.starts_on,
      membership.ends_on,
      new Date().toISOString().slice(0, 10),
    );
  const subscription = billing?.subscriptions.find(
    (s) => s.status === "active" && s.period_end > new Date().toISOString(),
  );
  async function pay(kind: "month" | "year" | "portal") {
    setBusy(true);
    try {
      const result = await (kind === "portal" ? portal() : checkout({ data: { plan: kind } }));
      window.location.assign(result.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }
  async function erase() {
    if (confirmation !== "DELETE" || busy) return;
    setBusy(true);
    try {
      await remove({ data: { confirmation: "DELETE" } });
      qc.clear();
      onOpenChange(false);
      await onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profileMenu.couldNotDelete"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          setConfirmation("");
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("account.manage")}</DialogTitle>
          <DialogDescription>{t("account.identityNote")}</DialogDescription>
        </DialogHeader>
        <AvatarSettings userId={userId} />
        <dl className="text-sm">
          <dt className="font-medium">{t("account.supporter")}</dt>
          <dd>
            {subscription
              ? `${t("account.activeUntil")} ${subscription.period_end.slice(0, 10)}`
              : active
                ? `${t("account.activeUntil")} ${membership.ends_on}`
                : t("account.free")}
          </dd>
          <dt className="mt-3 font-medium">{t("account.accountId")}</dt>
          <dd className="break-all font-mono text-xs">{userId}</dd>
        </dl>
        {billing?.enabled &&
          (subscription ? (
            <Button variant="outline" disabled={busy} onClick={() => void pay("portal")}>
              {t("account.managePayment")}
            </Button>
          ) : !active ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("account.supporterPitch")}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={busy} onClick={() => void pay("month")}>
                  {t("account.planMonth")}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void pay("year")}>
                  {t("account.planYear")}
                </Button>
              </div>
            </div>
          ) : null)}
        <section className="space-y-3 border-t pt-4">
          <h2 className="font-semibold text-destructive">{t("account.delete")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("account.deleteWarning")}
          </p>
          <Input
            aria-label={t("account.confirmDelete")}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            disabled={busy}
          />
          <Button
            variant="destructive"
            disabled={confirmation !== "DELETE" || busy}
            onClick={() => void erase()}
            className="w-full"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("account.delete")}
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}
