# RappGym home dashboard with soft goals

## What you get
- A new **Home** page (first tab, shown after sign-in) with:
  - **Overview cards** computed from your logs: workouts this week / last 4 weeks, total sets and reps, days since last workout, streak, category split (Push/Pull/Legs/Core) over the last 30 days.
  - **Recent workouts**: the last 3 sessions with a link to Log.
  - **AI analysis + next-workout suggestion**: the same AI analysis as on Statistik, started with a button (no automatic AI cost). Suggested exercises link to the exercise page with pictures.
  - **My goals**: add, edit, mark done or delete soft goals in free text, e.g. "Åka skidor i januari", optionally with a target date.
- The AI takes your active goals into account (e.g. more legs/core and balance before a ski trip), and says which goal shaped each suggestion. Goals are treated as wishes, never as medical advice.
- Swedish/English as today. Statistik keeps its charts; its AI section stays and also uses the goals.

## Technical details
- New table `training_goals` (id, user_id, text, target_date nullable, status active/done, created_at), RLS owner-only + grants; migration in drizzle/migrations.
- New route `src/routes/_authenticated/home.tsx` (`/home`), English URL; added to masthead nav; sign-in and `/` redirect to `/home` instead of `/workout`.
- Overview numbers in a shared pure module `src/lib/dashboard.ts` (repeat counts summed, per-user log) with tests in `src/test/dashboard.test.ts`.
- `getTrainingInsights` reads the caller's active goals (user-scoped) and passes them as untrusted data; prompt updated to align recommendations with goals and dates; schema gains `goalNotes` string. Still explicit-button only, streamed Responses call, no retries.
- Shared `TrainingInsights` component reused on Home and Statistik.
- AGENTS.md / roadmap updated; verify with real account in browser.
