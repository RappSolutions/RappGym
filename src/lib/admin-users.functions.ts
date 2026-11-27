import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";

export type AdminUser = { id: string; email: string; name: string; provider: string; createdAt: string; lastSignIn: string | null; disabled: boolean; isAdmin: boolean; sets: number; workouts: number; consentVersion: number; membership: { startsOn: string; endsOn: string; reference: string | null } | null };

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertUserViewWritable(context.supabase);
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const all = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      all.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const [memberships, consents] = await Promise.all([supabaseAdmin.from("user_memberships").select("*"), supabaseAdmin.from("user_consents").select("user_id,terms_version")]);
    if (memberships.error || consents.error) throw new Error("Cannot read user details");
    const counts = new Map<string, { sets: number; workouts: Set<string> }>();
    for (let from=0; ; from+=1000) {
      const r = await supabaseAdmin.from("log_entries").select("user_id,sets,workout_id").eq("status", "completed").range(from,from+999);
      if (r.error) throw new Error(r.error.message);
      for (const row of r.data) { const c=counts.get(row.user_id) ?? {sets:0,workouts:new Set<string>()}; c.sets+=row.sets; if(row.workout_id)c.workouts.add(row.workout_id); counts.set(row.user_id,c); }
      if(r.data.length<1000)break;
    }
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin");
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    return all.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: String(u.user_metadata?.["full_name"] ?? u.user_metadata?.["name"] ?? ""),
      provider: (u.identities ?? []).map(i => i.provider).join(" + "),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
      isAdmin: admins.has(u.id),
      sets: counts.get(u.id)?.sets ?? 0, workouts: counts.get(u.id)?.workouts.size ?? 0,
      consentVersion: Math.max(0,...(consents.data ?? []).filter(c=>c.user_id===u.id).map(c=>c.terms_version)),
      membership: (()=>{const m=memberships.data?.find(m=>m.user_id===u.id);return m?{startsOn:m.starts_on,endsOn:m.ends_on,reference:m.stripe_reference}:null;})(),
    }));
  });

export const manageUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), action: z.enum(["makeAdmin", "removeAdmin", "disable", "enable", "delete"]) }))
  .handler(async ({ data, context }) => {
    await assertUserViewWritable(context.supabase);
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot change your own account here");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const a = supabaseAdmin;
    let error: { message: string } | null = null;
    if (data.action === "makeAdmin") ({ error } = await a.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" }));
    if (data.action === "removeAdmin") ({ error } = await a.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin"));
    if (data.action === "disable") ({ error } = await a.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" }));
    if (data.action === "enable") ({ error } = await a.auth.admin.updateUserById(data.userId, { ban_duration: "none" }));
    if (data.action === "delete") {
      const { eraseAccount } = await import("@/lib/account-erasure.server");
      await eraseAccount(data.userId);
    }
    if (error) throw new Error(error.message);
    return { ok: true };
  });
