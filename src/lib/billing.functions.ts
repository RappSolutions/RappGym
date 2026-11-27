import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";
import { z } from "zod";
import {
  BILLING_APP,
  billingConfigured,
  SUPPORTER_PLANS,
  SUPPORTER_PRODUCT_ID,
  SUPPORTER_CURRENCY,
} from "@/lib/billing-policy";
export const getBillingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const enabled = billingConfigured(process.env["RAPPGYM_BILLING_ENABLED"], process.env["STRIPE_SECRET_KEY"]);
    if (enabled) {
      const acc = await context.supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (acc.data) {
        const { syncCustomer } = await import("@/lib/billing.server");
        await syncCustomer(acc.data.stripe_customer_id).catch((e) =>
          console.error("[billing] sync failed", e),
        );
      }
    }
    const supporter = await context.supabase.rpc("has_supporter_access", { _user_id: context.userId });
    const { data, error } = await context.supabase
      .from("billing_subscriptions")
      .select("status,period_end,cancel_at_period_end")
      .eq("user_id", context.userId)
      .order("period_end", { ascending: false });
    if (error) throw new Error("Billing unavailable");
    return { enabled, supporter: !!supporter.data, subscriptions: data };
  });
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ plan: z.enum(["month", "year"]) }).parse(d))
  .handler(async ({ context, data: input }) => {
    await assertUserViewWritable(context.supabase);
    if (
      !billingConfigured(process.env["RAPPGYM_BILLING_ENABLED"], process.env["STRIPE_SECRET_KEY"])
    )
      throw new Error("Payments are not open yet");
    const { data: active, error: activeError } = await context.supabase.rpc(
      "has_supporter_access",
      { _user_id: context.userId },
    );
    if (activeError) throw new Error("Membership unavailable");
    if (active) throw new Error("Membership is already active");
    const { stripeClient } = await import("@/lib/billing.server");
    const stripe = stripeClient();
    const plan = SUPPORTER_PLANS[input.plan];
    const priceId = plan.priceId;
    const price = await stripe.prices.retrieve(priceId);
    const product = typeof price.product === "string" ? price.product : price.product.id;
    if (
      product !== SUPPORTER_PRODUCT_ID ||
      !price.active ||
      price.recurring?.interval !== plan.interval ||
      price.currency !== SUPPORTER_CURRENCY
    )
      throw new Error("Invalid RappGym price");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const account = await supabaseAdmin
      .from("billing_accounts")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (account.error) throw new Error("Billing identity unavailable");
    let customerId = account.data?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { metadata: { app: BILLING_APP, user_id: context.userId } },
        { idempotencyKey: `rappgym-customer-${context.userId}` },
      );
      customerId = customer.id;
      const saved = await supabaseAdmin
        .from("billing_accounts")
        .upsert({ user_id: context.userId, stripe_customer_id: customerId });
      if (saved.error) throw new Error("Billing identity could not be saved");
    }
    const origin = new URL(getRequest().url).origin;
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        client_reference_id: context.userId,
        metadata: { app: BILLING_APP },
        subscription_data: { metadata: { app: BILLING_APP } },
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/settings`,
        cancel_url: `${origin}/settings`,
        allow_promotion_codes: false,
      },
      { idempotencyKey: `rappgym-checkout-${context.userId}-${input.plan}-${Math.floor(Date.now() / 900000)}` },
    );
    if (!session.url) throw new Error("Checkout unavailable");
    return { url: session.url };
  });
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUserViewWritable(context.supabase);
    const account = await context.supabase
      .from("billing_accounts")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (account.error || !account.data) throw new Error("No billing account");
    const { stripeClient } = await import("@/lib/billing.server");
    const portal = await stripeClient().billingPortal.sessions.create({
      customer: account.data.stripe_customer_id,
      return_url: `${new URL(getRequest().url).origin}/settings`,
    });
    return { url: portal.url };
  });
