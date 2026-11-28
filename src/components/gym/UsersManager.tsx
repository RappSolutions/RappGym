import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  Eye,
  HeartHandshake,
  MoreHorizontal,
  ShieldMinus,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { listUsers, manageUser, type AdminUser } from "@/lib/admin-users.functions";
import { sortAdminUsers, type AdminUserSortKey, type SortDirection } from "@/lib/admin-user-list";
import { startUserView } from "@/lib/user-view.functions";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

const dateOnly = (value: string | null) => value?.slice(0, 10) ?? "—";

/** Admin-only list of everyone who has signed in, with role, disable and delete actions. */
export function UsersManager() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const verify = useServerFn(verifyMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState<AdminUserSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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
  const [viewBusy, setViewBusy] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
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
    setActionBusy(userId);
    try {
      await manage({ data: { userId, action } });
      toast.success(t("usersManager.done"));
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }

  async function inspect(userId: string) {
    setViewBusy(userId);
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
      setViewBusy(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const paid = (u: AdminUser) => !!u.paidUntil;
  const locale = language === "sv" ? "sv-SE" : "en-GB";
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    const filtered = users.filter(
      (u) =>
        [u.name, u.email, u.id].join(" ").toLocaleLowerCase(locale).includes(query) &&
        (filter === "all" ||
          (filter === "paid" ? paid(u) : filter === "disabled" ? u.disabled : !paid(u))),
    );
    return sortAdminUsers(filtered, sortKey, sortDirection, locale);
  }, [users, search, filter, sortKey, sortDirection, locale]);

  const sortLabels: Record<AdminUserSortKey, string> = {
    name: t("usersManager.sortName"),
    lastSignIn: t("usersManager.sortLastSignIn"),
    workouts: t("usersManager.sortWorkouts"),
    sets: t("usersManager.sortSets"),
    aiRequestsThisMonth: t("usersManager.sortAi"),
    paidUntil: t("usersManager.sortMembership"),
  };

  function toggleSort(key: AdminUserSortKey) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  function openMembership(u: AdminUser) {
    setMemberUser(u.id);
    setPayment({
      startsOn: today,
      endsOn: u.membership && u.membership.endsOn >= today ? u.membership.endsOn : membershipEndDate(today, 1),
      stripeReference: u.membership?.reference ?? "",
      note: u.membership?.note ?? "",
    });
  }

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

  function sortHeader(label: string, key: AdminUserSortKey, className = "") {
    const active = sortKey === key;
    return (
      <th className={`p-0 font-medium ${className}`} aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className="flex h-9 w-full items-center gap-1 px-3 text-left hover:bg-accent hover:text-accent-foreground" onClick={() => toggleSort(key)}>
          {label}
          {active && (sortDirection === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
        </button>
      </th>
    );
  }

  function badges(u: AdminUser) {
    const self = u.id === me;
    return (
      <>
        {u.isAdmin && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] leading-none text-primary-foreground">Admin</span>}
        {u.disabled && <span className="rounded bg-destructive px-1.5 py-0.5 text-[11px] leading-none text-destructive-foreground">{t("usersManager.disabled")}</span>}
        {self && <span className="text-[11px] text-muted-foreground">({t("usersManager.you")})</span>}
      </>
    );
  }

  function actions(u: AdminUser) {
    const self = u.id === me;
    const who = u.name || u.email;
    const disabled = saving || viewBusy !== null || actionBusy !== null;
    return (
      <div className="flex shrink-0 items-center justify-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="size-8" disabled={disabled} aria-label={t("usersManager.moreActions", { who })}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-1">
              <div>{who}</div>
              <div className="text-xs font-normal text-muted-foreground">{t("account.accountId")}</div>
              <code className="block break-all text-[10px] font-normal text-muted-foreground">{u.id}</code>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!self && !u.isAdmin && (
              <DropdownMenuItem onSelect={() => void inspect(u.id)}>
                <Eye />{t("userView.viewAs")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => openMembership(u)}>
              <HeartHandshake />{t("account.grantSupporter")}
            </DropdownMenuItem>
            {!self && (
              <>
                <DropdownMenuItem onSelect={() => void act(u.id, u.isAdmin ? "removeAdmin" : "makeAdmin", u.isAdmin ? t("usersManager.removeAdminFrom", { who }) : t("usersManager.makeAnAdmin", { who }))}>
                  {u.isAdmin ? <ShieldMinus /> : <ShieldPlus />}
                  {u.isAdmin ? t("usersManager.removeAdmin") : t("usersManager.makeAdmin")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void act(u.id, u.disabled ? "enable" : "disable", u.disabled ? t("usersManager.enableAgain", { who }) : t("usersManager.disableTheyCanNoLonger", { who }))}>
                  {u.disabled ? <CheckCircle2 /> : <Ban />}
                  {u.disabled ? t("usersManager.enable") : t("usersManager.disable")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void act(u.id, "delete", t("usersManager.permanentlyDeleteAndAllTheir", { who }))}>
                  <Trash2 />{t("common.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label={t("common.users")}>
      {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_15rem]">
        <Input
          aria-label={t("account.searchUsers")}
          placeholder={t("account.searchUsers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:col-span-2 lg:col-span-1"
        />
        <select
          aria-label={t("common.users")}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("account.allUsers")} ({users.length})</option>
          <option value="paid">{t("account.paidUsers")} ({users.filter(paid).length})</option>
          <option value="free">{t("account.freeUsers")}</option>
          <option value="disabled">{t("account.disabledUsers")}</option>
        </select>
        <div className="flex gap-1">
          <select
            aria-label={t("usersManager.sortBy")}
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as AdminUserSortKey)}
          >
            {(Object.keys(sortLabels) as AdminUserSortKey[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
          </select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-10 shrink-0"
            aria-label={`${t("usersManager.sortDirection")}: ${t(sortDirection === "asc" ? "usersManager.ascending" : "usersManager.descending")}`}
            onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
          >
            {sortDirection === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("usersManager.results", { shown: visibleUsers.length, total: users.length })}</p>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {sortHeader(t("common.name"), "name")}
              {sortHeader(t("usersManager.activity"), "lastSignIn")}
              {sortHeader(t("usersManager.training"), "workouts")}
              {sortHeader(t("usersManager.aiThisMonth"), "aiRequestsThisMonth")}
              {sortHeader(t("usersManager.membership"), "paidUntil")}
              <th className="px-3 py-2 text-right font-medium">{t("usersManager.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleUsers.map((u) => {
              const who = u.name || u.email;
              const secondary = [u.name ? u.email : "", u.provider].filter(Boolean).join(" · ");
              return (
                <tr key={u.id} className={u.disabled ? "text-muted-foreground" : ""}>
                  <td className="max-w-64 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium"><span className="break-words">{who}</span>{badges(u)}</div>
                    <div className="truncate text-xs text-muted-foreground" title={secondary}>{secondary}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div>{dateOnly(u.lastSignIn)}</div>
                    <div className="text-xs text-muted-foreground">{t("usersManager.created")} {dateOnly(u.createdAt)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{t("account.counts", { sets: u.sets, workouts: u.workouts })}</td>
                  <td className="px-3 py-2 tabular-nums">{u.aiRequestsThisMonth}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div>{paid(u) ? t("account.supporterUntil", { date: u.paidUntil }) : t("account.free")}</div>
                    <div className="text-xs text-muted-foreground">{t("account.consentVersion", { version: u.consentVersion })}</div>
                  </td>
                  <td className="px-3 py-2">{actions(u)}</td>
                </tr>
              );
            })}
            {!isLoading && !error && visibleUsers.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">{t("usersManager.noResults")}</td></tr>}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {visibleUsers.map((u) => {
          const who = u.name || u.email;
          const secondary = [u.name ? u.email : "", u.provider].filter(Boolean).join(" · ");
          return (
            <li key={u.id} className={`space-y-2 py-3 ${u.disabled ? "text-muted-foreground" : ""}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-medium"><span className="break-words">{who}</span>{badges(u)}</div>
                  <div className="break-words text-xs text-muted-foreground">{secondary}</div>
                </div>
                {actions(u)}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><dt className="inline text-muted-foreground">{t("usersManager.lastSignIn")}: </dt><dd className="inline">{dateOnly(u.lastSignIn)}</dd></div>
                <div><dt className="inline text-muted-foreground">{t("usersManager.created")}: </dt><dd className="inline">{dateOnly(u.createdAt)}</dd></div>
                <div><dt className="inline text-muted-foreground">{t("usersManager.training")}: </dt><dd className="inline">{t("account.counts", { sets: u.sets, workouts: u.workouts })}</dd></div>
                <div><dt className="inline text-muted-foreground">{t("usersManager.aiThisMonth")}: </dt><dd className="inline tabular-nums">{u.aiRequestsThisMonth}</dd></div>
                <div className="col-span-2"><dt className="inline text-muted-foreground">{t("usersManager.membership")}: </dt><dd className="inline">{paid(u) ? t("account.supporterUntil", { date: u.paidUntil }) : t("account.free")} · {t("account.consentVersion", { version: u.consentVersion })}</dd></div>
              </dl>
            </li>
          );
        })}
        {!isLoading && !error && visibleUsers.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">{t("usersManager.noResults")}</li>}
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
          <p className="break-words text-sm font-medium">{users.find((u) => u.id === memberUser)?.email}</p>
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
