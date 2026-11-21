import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";

export const supportInput = z.object({
  kind: z.enum(["question", "feedback", "bug"]),
  message: z.string().trim().min(1).max(4000),
  client: z.object({
    userAgent: z.string().max(500),
    viewport: z.string().max(40),
    language: z.string().max(10),
    path: z.string().max(200),
    gymName: z.string().max(200),
  }),
});

/** Stores a contact message with account diagnostics collected server-side (client fields are informational only). */
export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(supportInput)
  .handler(async ({ data, context }) => {
    await assertUserViewWritable(context.supabase);
    const { supabase, userId, claims } = context;
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const name = String(meta["full_name"] ?? meta["name"] ?? "");
    const email = user?.email ?? String(claims["email"] ?? "");
    const [completed, workouts, quota] = await Promise.all([
      supabase.from("log_entries").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("workouts").select("id", { count: "exact", head: true }),
      supabase.rpc("ai_quota_status", { _user_id: userId }),
    ]);
    const q = quota.data?.[0];
    const diagnostics = {
      userId,
      provider: user?.app_metadata?.["provider"] ?? "",
      createdAt: user?.created_at?.slice(0, 10) ?? "",
      lastSignIn: user?.last_sign_in_at?.slice(0, 10) ?? "",
      completedSets: completed.count ?? 0,
      workouts: workouts.count ?? 0,
      aiQuota: q ? `${q.used}/${q.quota ?? "∞"} (${q.tier_name})` : "",
      ...data.client,
    };
    const { data: row, error } = await supabase.from("support_messages")
      .insert({ user_id: userId, kind: data.kind, message: data.message, sender_email: email, sender_name: name, diagnostics })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
