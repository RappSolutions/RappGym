import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";
import { deleteAccountSchema, membershipSchema } from "@/lib/account-policy";
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(deleteAccountSchema)
  .handler(async ({ context }) => {
    await assertUserViewWritable(context.supabase);
    const { eraseAccount } = await import("@/lib/account-erasure.server");
    await eraseAccount(context.userId);
    return { ok: true };
  });
export const verifyMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(membershipSchema)
  .handler(async ({ data, context }) => {
    await assertUserViewWritable(context.supabase);
    const { error } = await context.supabase.rpc("set_manual_membership", {
      _user_id: data.userId,
      _starts_on: data.startsOn,
      _ends_on: data.endsOn,
      _stripe_reference: data.stripeReference,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
