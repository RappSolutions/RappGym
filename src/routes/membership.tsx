import { createFileRoute } from "@tanstack/react-router";
import { PublicFrame } from "@/components/gym/PublicFrame";
import { publicHead } from "@/lib/public-head";
export const Route = createFileRoute("/membership")({
  head: () =>
    publicHead(
      "Supporter",
      "Free workout logging and optional supporter access to private training locations. Payment launch is being prepared.",
    ),
  component: Membership,
});
function Membership() {
  return (
    <PublicFrame>
      <h1 className="font-display text-3xl font-bold">Train free. Support what you use.</h1>
      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl font-bold">Free</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>Workout logging and circuits</li>
            <li>Progress and workout summaries</li>
            <li>Excel and PDF exports</li>
            <li>Full exercise bank at Gymmet</li>
            <li>Limited optional AI requests</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">Supporter</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>Create private locations</li>
            <li>Select the equipment at each location</li>
            <li>Higher, still limited AI allowance</li>
            <li>Support continued development</li>
          </ul>
        </section>
      </div>
      <section className="border-t pt-6">
        <h2 className="font-display text-xl font-bold">Price: €4/month or €40/year</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Sign in and choose "Become a supporter" on the Home screen or in your account menu. Payment
          is handled by Stripe and can be cancelled at any time. Access is linked to your app account,
          not the email on your receipt.
        </p>
        <p className="mt-3 text-sm">
          Questions?{" "}
          <a className="underline" href="mailto:gym@rappsol.com">
            gym@rappsol.com
          </a>
        </p>
      </section>
    </PublicFrame>
  );
}
