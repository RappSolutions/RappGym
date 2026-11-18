import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lastMonths, mapQuotaRow, monthKey, type AiQuotaStatus } from "@/lib/ai-quota";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const getMyAiQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiQuotaStatus> => {
    const { data, error } = await context.supabase.rpc("ai_quota_status", { _user_id: context.userId });
    if (error || !data?.[0]) throw new Error(error?.message ?? "No quota");
    return mapQuotaRow(data[0]);
  });

export type AiTier = { id: string; name: string; monthlyQuota: number | null; isDefault: boolean };
export type UserQuotaSetting = { tierId: string; customQuota: number | null; isBlocked: boolean; validUntil: string | null; notes: string | null };
export type UserUsage = { userId: string; status: AiQuotaStatus; setting: UserQuotaSetting | null; monthly: Record<string, number>; tokens: number; costUsd: number };
export type AiUsageReport = { months: string[]; tiers: AiTier[]; users: UserUsage[] };

export const getAiUsageReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), months: z.number().int().min(1).max(24) }))
  .handler(async ({ data, context }): Promise<AiUsageReport> => {
    await assertAdmin(context);
    const sb = context.supabase;
    const months = lastMonths(data.today, data.months);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users, error: uErr }, tiersRes, settingsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      sb.from("ai_tiers").select("id,name,monthly_ai_quota,is_default").order("sort_order"),
      sb.from("user_ai_quotas").select("*"),
    ]);
    if (uErr) throw new Error(uErr.message);
    if (tiersRes.error) throw new Error(tiersRes.error.message);
    if (settingsRes.error) throw new Error(settingsRes.error.message);
    const history: { user_id: string; generated_at: string; input_tokens: number | null; output_tokens: number | null; cost_usd: number | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const r = await supabaseAdmin.from("training_ai_history").select("user_id,generated_at,input_tokens,output_tokens,cost_usd").gte("generated_at", `${months[0]}-01T00:00:00Z`).range(from, from + 999);
      if (r.error) throw new Error(r.error.message);
      history.push(...(r.data as typeof history));
      if (r.data.length < 1000) break;
    }
    const settings = new Map(settingsRes.data.map((s) => [s.user_id, s]));
    const result: UserUsage[] = [];
    for (const u of users.users) {
      const st = await sb.rpc("ai_quota_status", { _user_id: u.id });
      if (st.error || !st.data?.[0]) throw new Error(st.error?.message ?? "No quota");
      const rows = history.filter((h) => h.user_id === u.id);
      const monthly: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
      for (const h of rows) { const k = monthKey(h.generated_at); if (k in monthly) monthly[k]! += 1; }
      const s = settings.get(u.id);
      result.push({
        userId: u.id, status: mapQuotaRow(st.data[0]), monthly,
        tokens: rows.reduce((a, h) => a + (h.input_tokens ?? 0) + (h.output_tokens ?? 0), 0),
        costUsd: rows.reduce((a, h) => a + Number(h.cost_usd ?? 0), 0),
        setting: s ? { tierId: s.tier_id, customQuota: s.custom_quota, isBlocked: s.is_blocked, validUntil: s.valid_until, notes: s.notes } : null,
      });
    }
    return { months, tiers: tiersRes.data.map((t) => ({ id: t.id, name: t.name, monthlyQuota: t.monthly_ai_quota, isDefault: t.is_default })), users: result };
  });

export const setUserAiQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    userId: z.string().uuid(),
    setting: z.object({ tierId: z.string().min(1).max(40), customQuota: z.number().int().min(0).max(100000).nullable(), isBlocked: z.boolean(), validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), notes: z.string().max(500).nullable() }).nullable(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    if (!data.setting) {
      const { error } = await sb.from("user_ai_quotas").delete().eq("user_id", data.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const s = data.setting;
    const { error } = await sb.from("user_ai_quotas").upsert({ user_id: data.userId, tier_id: s.tierId, custom_quota: s.customQuota, is_blocked: s.isBlocked, valid_until: s.validUntil, notes: s.notes?.trim() || null, updated_at: new Date().toISOString(), updated_by: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
