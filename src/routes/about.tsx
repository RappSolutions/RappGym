import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFrame } from "@/components/gym/PublicFrame";
import { Button } from "@/components/ui/button";
import { publicHead } from "@/lib/public-head";
import logo from "@/assets/RappGym_1024.png";
export const Route = createFileRoute("/about")({
  head: () =>
    publicHead(
      "Meet RappGym",
      "A workout diary that keeps up with you. Log sets, train circuits and see your progress.",
    ),
  component: About,
});
function About() {
  return (
    <PublicFrame>
      <section className="border-b pb-8">
        <img
          src={logo}
          alt="RappGym"
          width={160}
          height={160}
          className="mx-auto size-40 object-contain"
        />
        <h1 className="mt-4 text-center font-display text-4xl font-bold text-brand-blue">
          RappGym
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-lg">
          Less typing. More training. Instructions, illustrations, and the AI can plan workouts for you. 
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button asChild>
            <Link to="/">Start training</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/exercises">Browse exercises</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          [
            "Remember your last set",
            "Your previous weight and reps are ready when you are. Adjust, finish, move on.",
          ],
          [
            "Your workout, your way",
            "Follow a plan or start with one exercise. Train in circuits or finish each exercise before the next.",
          ],
          [
            "See what you actually did",
            "Sets, reps, weight lifted and personal bests. A useful summary after every workout, not a wall of badges.",
          ],
        ].map(([title, text]) => (
          <div key={title}>
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
      <section className="border-t pt-6">
        <h2 className="font-display text-2xl font-bold">Built by someone who needed it</h2>
        <p className="mt-2 max-w-2xl leading-relaxed">
          I started RappGym to make my own workouts easier to record. It grew into circuits,
          hotel-gym plans and graphs I actually want to look at. No public leaderboard. No pressure
          to turn your workout into content. Just you, your training and occasionally a ridiculous
          button.
        </p>
        <a
          className="mt-3 inline-block text-sm underline"
          href="https://jonasr.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Jonas Rapp →
        </a>
      </section>
    </PublicFrame>
  );
}
