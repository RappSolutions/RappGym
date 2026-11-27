import { supabaseAdmin } from "@/integrations/supabase/client.server";
/** Private application data is erased in one DB transaction; Auth is removed last. Retry is idempotent. */
export async function eraseAccount(userId: string) {
  const subscriptions = await supabaseAdmin
    .from("billing_subscriptions")
    .select("stripe_subscription_id,status")
    .eq("user_id", userId);
  if (subscriptions.error) throw new Error("Cannot check subscriptions");
  if (
    subscriptions.data.some((s) => s.status !== "canceled" && s.status !== "incomplete_expired")
  ) {
    const { stripeClient } = await import("@/lib/billing.server");
    const stripe = stripeClient();
    for (const s of subscriptions.data)
      if (s.status !== "canceled" && s.status !== "incomplete_expired")
        await stripe.subscriptions.cancel(s.stripe_subscription_id);
  }
  const { error } = await supabaseAdmin.rpc("erase_account_data", { _user_id: userId });
  if (error) throw new Error(error.message);
  const result = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (result.error) throw new Error(result.error.message);
}
