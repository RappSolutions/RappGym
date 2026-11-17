import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUser = { id: string; email: string; name: string; provider: string; createdAt: string; lastSignIn: string | null; disabled: boolean; isAdmin: boolean };
type Action = "makeAdmin" | "removeAdmin" | "disable" | "enable" | "delete";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin");
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: String(u.user_metadata?.["full_name"] ?? u.user_metadata?.["name"] ?? ""),
      provider: String(u.app_metadata?.["provider"] ?? ""),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
      isAdmin: admins.has(u.id),
    }));
  });

export const manageUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; action: Action }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId)) throw new Error("Invalid user");
    if (!["makeAdmin", "removeAdmin", "disable", "enable", "delete"].includes(input.action)) throw new Error("Invalid action");
    return input;
  })
  .handler(async ({ data, context }) => {
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
      for (const table of ["log_entries", "training_goals", "training_profiles", "training_ai_history"] as const) {
        const r = await a.from(table).delete().eq("user_id", data.userId);
        if (r.error) throw new Error(r.error.message);
      }
    }
    if (data.action === "delete") ({ error } = await a.auth.admin.deleteUser(data.userId));
    if (error) throw new Error(error.message);
    return { ok: true };
  });
