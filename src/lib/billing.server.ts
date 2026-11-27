import Stripe from "stripe";
import { BILLING_APP, isSupporterPrice } from "./billing-policy";
export function stripeClient() {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payments unavailable");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
}
export async function syncSubscription(subscriptionId: string) {
  const stripe = stripeClient();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (
    sub.metadata["app"] !== BILLING_APP ||
    !item ||
    !isSupporterPrice(item.price.id)
  )
    return;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const account = await supabaseAdmin
    .from("billing_accounts")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (account.error) throw new Error("Billing identity unavailable");
  if (!account.data) return;
  const r = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert({
      stripe_subscription_id: sub.id,
      user_id: account.data.user_id,
      tier_id: "supporter",
      stripe_price_id: item.price.id,
      status: sub.status,
      period_end: new Date(item.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    });
  if (r.error) throw new Error("Subscription could not be saved");
}
/** Pull current RappGym subscriptions for a customer from Stripe (no webhook needed). */
export async function syncCustomer(customerId: string) {
  const subs = await stripeClient().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  for (const s of subs.data) if (s.metadata["app"] === BILLING_APP) await syncSubscription(s.id);
}
