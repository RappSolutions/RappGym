import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canInspectUser } from "@/lib/impersonation-policy";
import { i18n } from "@/lib/i18n-core";

export type UserView = { actorId: string; userId: string; readOnly: boolean; name: string; email: string };

export const getUserView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserView> => {
    const { data: userId, error } = await context.supabase.rpc("effective_user_id");
    if (error || !userId) throw new Error(error?.message ?? "No user");
    if (userId === context.userId) {
      // A removed admin role, deleted target or target promotion revokes inspection immediately.
      const { error: endError } = await context.supabase.rpc("end_user_view");
      if (endError) throw new Error(endError.message);
      return { actorId: context.userId, userId, readOnly: false, name: "", email: "" };
    }
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !data.user) throw new Error(userError?.message ?? "No user");
    return { actorId: context.userId, userId, readOnly: true, name: String(data.user.user_metadata?.["full_name"] ?? data.user.user_metadata?.["name"] ?? ""), email: data.user.email ?? "" };
  });

export const startUserView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), language: z.enum(["sv", "en"]).default("sv") }))
  .handler(async ({ context, data }) => {
    if (!context.claims["session_id"]) throw new Error(i18n.getFixedT(data.language)("userView.sessionRequired"));
    const [actor, target] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: data.userId, _role: "admin" }),
    ]);
    if (actor.error || target.error || !canInspectUser(context.userId, actor.data, data.userId, target.data)) throw new Error("Forbidden");
    const { error } = await context.supabase.rpc("start_user_view", { _target_user_id: data.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endUserView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("end_user_view");
    if (error) throw new Error(error.message);
    return { ok: true };
  });