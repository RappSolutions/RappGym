import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";

export const supportInput = z.object({
  kind: z.enum(["question", "feedback", "bug"]),
  message: z.string().trim().min(1).max(4000),
});

/** Persist before delivery; account identity is never accepted from the browser. */
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
    const { data: row, error } = await supabase.from("support_messages")
      .insert({ user_id: userId, kind: data.kind, message: data.message, sender_email: email, sender_name: name, diagnostics: {} })
      .select("id").single();
    if (error) throw new Error(error.message);
    const { sendSupportEmail } = await import("./support-email.server");
    const delivered = await sendSupportEmail({
      id: row.id, kind: data.kind, message: data.message,
      senderEmail: email, senderName: name, userId,
    });
    return { id: row.id, delivered };
  });
