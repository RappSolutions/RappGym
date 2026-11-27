import { createFileRoute } from "@tanstack/react-router";
import { PublicFrame } from "@/components/gym/PublicFrame";
import { publicHead } from "@/lib/public-head";
export const Route = createFileRoute("/features")({
  head: () =>
    publicHead(
      "Workout features",
      "Circuits, quick set logging, workout summaries, optional AI plans and Excel/PDF exports.",
    ),
  component: Features,
});
function Features() {
  return (
    <PublicFrame>
      <h1 className="font-display text-3xl font-bold">Your workout. Without the paperwork.</h1>
      <dl className="divide-y">
        {[
          [
            "Finish a set. Record it. Keep going.",
            "Weight and reps are prefilled from your previous training. Mark how hard the set felt on a colour band. The numbers stay useful; the button text has a sense of humour.",
          ],
          [
            "Circuits or one exercise at a time",
            "Follow rounds across exercises, or complete all sets at one station. Add another exercise when you feel like it. Finish when you are done.",
          ],
          [
            "A plan is not a workout you have done",
            "Planned sets stay separate from completed sets. Your progress includes only the work you actually logged.",
          ],
          [
            "Progress you can read",
            "See total weight lifted over time, exercise progress, personal bests and a summary of each workout. Rest days stay visible in the calendar.",
          ],
          [
            "Optional AI, on your terms",
            "Ask for a plan or training analysis when you want one. Requests are limited, never unlimited. Suggestions are not medical advice. You choose what to accept.",
          ],
          [
            "Keep your own copy",
            "Export your completed log to Excel with workout, week, exercise and location summaries. Download a workout PDF, with exercise pictures if you want them.",
          ],
          [
            "Home, gym, hotel",
            "Everyone starts with Gymmet: the full exercise bank. Active supporters can create private locations and tick the equipment they actually have.",
          ],
          [
            "Private training. Public exercise bank.",
            "Browse exercises without signing in. Your personal training is not a public profile. Sign in with Google or Microsoft; the app supports Swedish and English.",
          ],
        ].map(([title, text]) => (
          <div key={title} className="grid gap-2 py-5 sm:grid-cols-[1fr_1.5fr]">
            <dt className="font-display text-xl font-bold">{title}</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
    </PublicFrame>
  );
}
