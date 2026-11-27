import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, CheckCircle2, ShieldMinus, ShieldPlus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verifyMembership } from "@/lib/account.functions";
import { membershipEndDate, membershipSchema } from "@/lib/account-policy";
import { LogDatePicker } from "./LogDatePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listUsers, manageUser } from "@/lib/admin-users.functions";
import { startUserView } from "@/lib/user-view.functions";
import { formatDate } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

/** Admin-only list of everyone who has signed in, with role, disable and delete actions. */
export function UsersManager() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const verify = useServerFn(verifyMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [memberUser, setMemberUser] = useState<string | null>(null);
  const [payment, setPayment] = useState({
    startsOn: new Date().toISOString().slice(0, 10),
    endsOn: "",
    stripeReference: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const list = useServerFn(listUsers);
  const manage = useServerFn(manageUser);
  const startView = useServerFn(startUserView);
  const [viewBusy, setViewBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  async function act(
    userId: string,
    action: "makeAdmin" | "removeAdmin" | "disable" | "enable" | "delete",
    confirmText: string,
  ) {
    if (!(await confirmDialog(confirmText))) return;
    try {
      await manage({ data: { userId, action } });
      toast.success(t("usersManager.done"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function inspect(userId: string) {
    setViewBusy(true);
    try {
      await startView({ data: { userId, language } });
      // The new document owns a fresh cache; cancelling mounted queries here
      // can reject a pending Suspense/route-loader promise before navigation.
      const channel = new BroadcastChannel("rappgym-user-view");
      channel.postMessage("changed");
      channel.close();
      window.location.assign("/home");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("userView.failed"));
      setViewBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const paid = (u: (typeof users)[number]) => !!u.paidUntil;
  const filtered = users.filter(
    (u) =>
      [u.name, u.email, u.id].join(" ").toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "paid" ? paid(u) : filter === "disabled" ? u.disabled : !paid(u))),
  );
  async function savePayment() {
    if (!memberUser) return;
    setSaving(true);
    try {
      await verify({ data: membershipSchema.parse({ userId: memberUser, ...payment }) });
      toast.success(t("account.membershipSaved"));
      setMemberUser(null);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-3" aria-label={t("common.users")}>
      {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label={t("account.searchUsers")}
          placeholder={t("account.searchUsers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label={t("common.users")}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">
            {t("account.allUsers")} ({users.length})
          </option>
          <option value="paid">
            {t("account.paidUsers")} ({users.filter(paid).length})
          </option>
          <option value="free">{t("account.freeUsers")}</option>
          <option value="disabled">{t("account.disabledUsers")}</option>
        </select>
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((u) => {
          const self = u.id === me;
          const who = u.name || u.email;
          return (
            <li key={u.id} className="space-y-2 py-3">
              <div className={u.disabled ? "text-muted-foreground" : ""}>
                <div className="font-medium">
                  {who}
                  {u.isAdmin && (
                    <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                      Admin
                    </span>
                  )}
                  {u.disabled && (
                    <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                      {t("usersManager.disabled")}
                    </span>
                  )}
                  {self && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({t("usersManager.you")})
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.email} · {u.provider} · {t("usersManager.created")}{" "}
                  {formatDate(u.createdAt.slice(0, 10))}
                  {u.lastSignIn
                    ? ` · ${t("usersManager.lastSignIn")} ${formatDate(u.lastSignIn.slice(0, 10))}`
                    : ""}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("account.counts", { sets: u.sets, workouts: u.workouts })} ·{" "}
                {t("account.consentVersion", { version: u.consentVersion })} ·{" "}
                {paid(u) ? t("account.supporterUntil", { date: u.paidUntil }) : t("account.free")}
              </p>
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("account.accountId")}
                </summary>
                <code className="break-all text-xs">{u.id}</code>
              </details>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMemberUser(u.id);
                  setPayment({
                    startsOn: today,
                    endsOn: u.membership && u.membership.endsOn >= today ? u.membership.endsOn : membershipEndDate(today, 1),
                    stripeReference: u.membership?.reference ?? "",
                    note: u.membership?.note ?? "",
                  });
                }}
              >
                {t("account.grantSupporter")}
              </Button>
              {!self && (
                <div className="flex flex-wrap gap-2">
                  {!u.isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={viewBusy}
                      onClick={() => void inspect(u.id)}
                    >
                      <Eye className="size-4" />
                      {t("userView.viewAs")}
                    </Button>
                  )}
                  {u.isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void act(u.id, "removeAdmin", t("usersManager.removeAdminFrom", { who }))
                      }
                    >
                      <ShieldMinus className="size-4" />
                      {t("usersManager.removeAdmin")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void act(u.id, "makeAdmin", t("usersManager.makeAnAdmin", { who }))
                      }
                    >
                      <ShieldPlus className="size-4" />
                      {t("usersManager.makeAdmin")}
                    </Button>
                  )}
                  {u.disabled ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void act(u.id, "enable", t("usersManager.enableAgain", { who }))
                      }
                    >
                      <CheckCircle2 className="size-4" />
                      {t("usersManager.enable")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void act(u.id, "disable", t("usersManager.disableTheyCanNoLonger", { who }))
                      }
                    >
                      <Ban className="size-4" />
                      {t("usersManager.disable")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() =>
                      void act(
                        u.id,
                        "delete",
                        t("usersManager.permanentlyDeleteAndAllTheir", { who }),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                    {t("common.delete")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog
        open={!!memberUser}
        onOpenChange={(v) => {
          if (!v && !saving) setMemberUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.grantSupporter")}</DialogTitle>
            <DialogDescription>{t("account.manualSupporterHelp")}</DialogDescription>
          </DialogHeader>
          <p className="break-words text-sm font-medium">
            {users.find((u) => u.id === memberUser)?.email}
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void savePayment();
            }}
          >
            <div className="space-y-2">
              <Label>{t("account.endsOn")}</Label>
              <LogDatePicker value={payment.endsOn} onChange={(endsOn) => setPayment({ ...payment, endsOn })} />
              <div className="flex flex-wrap gap-2">
                {([1, 3, 12] as const).map((months) => (
                  <Button key={months} type="button" variant="outline" size="sm" onClick={() => setPayment({ ...payment, endsOn: membershipEndDate(today, months) })}>
                    {t(`account.extend${months}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="membership-note">{t("account.membershipNote")}</Label>
              <Input id="membership-note" maxLength={255} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{t("account.paymentReferenceOptional")}</summary>
            {(["stripeReference"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={`payment-${field}`}>{t(`account.${field}`)}</Label>
                <Input
                  id={`payment-${field}`}
                  maxLength={255}
                  placeholder="pi_…"
                  value={payment[field]}
                  onChange={(e) => setPayment({ ...payment, [field]: e.target.value })}
                />
              </div>
            ))}
            </details>
            <Button type="submit" disabled={saving || !payment.endsOn || payment.endsOn < today} className="w-full">
              {t("account.saveMembership")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
