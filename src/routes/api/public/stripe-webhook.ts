import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAPPGYM_STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Invalid signature", { status: 400 });
        if (Number(request.headers.get("content-length") ?? 0) > 1048576)
          return new Response("Too large", { status: 413 });
        const body = await request.text();
        if (body.length > 1048576) return new Response("Too large", { status: 413 });
        const { stripeClient, syncSubscription } = await import("@/lib/billing.server");
        const stripe = stripeClient();
        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }
        try {
          if (
            event.type === "customer.subscription.created" ||
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
          ) {
            await syncSubscription(event.data.object.id);
          }
          return Response.json({ received: true });
        } catch {
          return new Response("Retry required", { status: 500 });
        }
      },
    },
  },
});
