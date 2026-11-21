import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Ban, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { listUsers } from "@/lib/admin-users.functions";
import { getAiUsageReport, setUserAiQuota, type AiTier, type UserUsage } from "@/lib/ai-quota.functions";
import { quotaRemaining } from "@/lib/ai-quota";
import { todayISO } from "@/lib/gym";
import { SEK_PER_USD } from "@/lib/ai-cost";
import { useLanguage } from "@/lib/i18n";

const MONTHS = 6;

/** Admin view: AI usage per user and month, plus per-user quota overrides (tier, custom limit, block). */
export function AiUsageManager() {
  const { t, language } = useLanguage();
  const report = useServerFn(getAiUsageReport);
  const users = useServerFn(listUsers);
  const today = todayISO();
  const { data, isLoading, error } = useQuery({ queryKey: ["ai-quota", "report", today], queryFn: () => report({ data: { today, months: MONTHS } }) });
  const { data: people = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => users() });
  const [editing, setEditing] = useState<string | null>(null);
  const nameOf = (id: string) => { const p = people.find((u) => u.id === id); return p ? p.name || p.email : id.slice(0, 8); };

  const active = useMemo(() => (data?.users ?? []).filter((u) => Object.values(u.monthly).some((n) => n > 0)), [data]);
  const config = useMemo<ChartConfig>(() => Object.fromEntries(active.map((u, i) => [u.userId, { label: nameOf(u.userId), color: `var(--chart-${(i % 5) + 1})` }])), [active, people]);
  const chartData = useMemo(() => (data?.months ?? []).map((m) => ({ month: m, ...Object.fromEntries(active.map((u) => [u.userId, u.monthly[m] ?? 0])) })), [data, active]);

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (error || !data) return <p className="text-sm text-destructive">{error?.message}</p>;
  const locale = language === "sv" ? "sv-SE" : "en-GB";
  const kr = (usd: number, d = 2) => `${(usd * SEK_PER_USD).toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d })} kr`;
  const colorOf = new Map(active.map((u, i) => [u.userId, `var(--chart-${(i % 5) + 1})`]));
  const thisMonth = data.months[data.months.length - 1]!;
  const total = data.users.reduce((a, u) => a + (u.monthly[thisMonth] ?? 0), 0);
  const cost = data.users.reduce((a, u) => a + u.costUsd, 0);

  return <section className="space-y-4">
    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
      <span>{t("aiUsageManager.thisMonth")}: <b className="text-foreground">{total}</b> {t("aiUsageManager.requests")}</span>
      <span>{t("aiUsageManager.lastMonths", { MONTHS })}: <b className="text-foreground">{kr(cost)}</b></span>
      <span>{t("aiUsageManager.default")}: {data.tiers.filter((x) => x.isDefault).map((x) => `${x.name} ${x.monthlyQuota ?? "∞"}/${t("aiUsageManager.mo")}`).join(", ")}</span>
    </div>
    {active.length > 0
      ? <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <BarChart data={chartData} margin={{ left: -20, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {active.map((u, i) => <Bar key={u.userId} dataKey={u.userId} stackId="a" fill={`var(--color-${u.userId})`} radius={i === active.length - 1 ? [3, 3, 0, 0] : 0} />)}
          </BarChart>
        </ChartContainer>
      : <p className="text-sm text-muted-foreground">{t("aiUsageManager.noAiRequestsYet")}</p>}
    <ul className="divide-y divide-border">{[...data.users].sort((a, b) => b.tokens - a.tokens || nameOf(a.userId).localeCompare(nameOf(b.userId), locale)).map((u) => {
      const s = u.status; const rem = quotaRemaining(s);
      const label = s.isAdmin ? "Admin ∞" : s.isBlocked ? t("aiUsageManager.blocked") : s.quota === null ? `${s.tierName} ∞` : `${s.used}/${s.quota}${s.source === "custom" ? ` (${t("aiUsageManager.custom")})` : ""}`;
      const pct = s.quota ? Math.min(100, (s.used / s.quota) * 100) : 0;
      return <li key={u.userId} className="py-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate text-sm font-medium"><span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf.get(u.userId) ?? "var(--muted)" }} />{nameOf(u.userId)}</div>
            <div className="text-xs text-muted-foreground">{s.tierName} · {u.tokens.toLocaleString("sv-SE")} tokens · {kr(u.costUsd)}{u.setting?.validUntil ? ` · ${t("aiUsageManager.until")} ${u.setting.validUntil}` : ""}{u.setting?.notes ? ` · ${u.setting.notes}` : ""}</div>
            {s.quota !== null && !s.isAdmin && <div className="mt-1 h-1 w-full max-w-48 overflow-hidden rounded bg-muted"><div className={rem === 0 ? "h-full bg-destructive" : "h-full bg-primary"} style={{ width: `${pct}%` }} /></div>}
          </div>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${s.isBlocked ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{s.isBlocked && <Ban className="mr-1 inline size-3" />}{label}</span>
          {!s.isAdmin && <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={t("aiUsageManager.editQuota")} onClick={() => setEditing(editing === u.userId ? null : u.userId)}><Pencil className="size-4" /></Button>}
        </div>
        {editing === u.userId && <QuotaEditor user={u} tiers={data.tiers} onDone={() => setEditing(null)} />}
      </li>;
    })}</ul>
  </section>;
}

function QuotaEditor({ user, tiers, onDone }: { user: UserUsage; tiers: AiTier[]; onDone: () => void }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const save = useServerFn(setUserAiQuota);
  const def = tiers.find((x) => x.isDefault) ?? tiers[0]!;
  const s = user.setting;
  const [tierId, setTierId] = useState(s?.tierId ?? def.id);
  const [custom, setCustom] = useState(s?.customQuota != null ? String(s.customQuota) : "");
  const [blocked, setBlocked] = useState(s?.isBlocked ?? false);
  const [until, setUntil] = useState(s?.validUntil ?? "");
  const [notes, setNotes] = useState(s?.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function run(setting: Parameters<typeof save>[0]["data"]["setting"]) {
    setBusy(true);
    try { await save({ data: { userId: user.userId, setting } }); toast.success(t("aiUsageManager.saved")); await qc.invalidateQueries({ queryKey: ["ai-quota"] }); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const customNum = custom.trim() === "" ? null : Number(custom);
  const valid = (customNum === null || (Number.isInteger(customNum) && customNum >= 0)) && (until === "" || /^\d{4}-\d{2}-\d{2}$/.test(until));

  return <div className="mt-2 grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
    <label className="space-y-1"><span className="text-xs text-muted-foreground">{t("aiUsageManager.tier")}</span>
      <select className="h-9 w-full rounded-md border bg-background px-2" value={tierId} onChange={(e) => setTierId(e.target.value)}>
        {tiers.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.monthlyQuota ?? "∞"}/{t("aiUsageManager.mo")})</option>)}
      </select></label>
    <label className="space-y-1"><span className="text-xs text-muted-foreground">{t("aiUsageManager.customMonthlyQuotaEmptyTier")}</span>
      <Input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))} /></label>
    <label className="space-y-1"><span className="text-xs text-muted-foreground">{t("aiUsageManager.validUntilYyyyMmDd")}</span>
      <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
    <label className="space-y-1"><span className="text-xs text-muted-foreground">{t("aiUsageManager.note")}</span>
      <Input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} /></label>
    <label className="flex items-center gap-2 sm:col-span-2"><Switch checked={blocked} onCheckedChange={setBlocked} />{t("aiUsageManager.blockAiRequestsEntirely")}</label>
    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
      {s && <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { if (await confirmDialog(t("aiUsageManager.resetToDefaultQuota"))) void run(null); }}>{t("aiUsageManager.resetToDefault")}</Button>}
      <Button size="sm" variant="ghost" disabled={busy} onClick={onDone}>{t("common.cancel")}</Button>
      <Button size="sm" variant="outline" disabled={busy || !valid} onClick={() => void run({ tierId, customQuota: customNum, isBlocked: blocked, validUntil: until || null, notes: notes || null })}>{t("common.save")}</Button>
    </div>
  </div>;
}
