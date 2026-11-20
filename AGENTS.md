<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Gym log app
- Split explicit single-kg suggested loads into numeric load and preserved note advice at acceptance/editing boundaries, never retroactively reinterpret completed history.
- Use the shared ISO log date picker with an interactive Shadcn calendar inside the drawer, so selecting dates is independent of native browser picker support.
- Keep AI analysis/planning/history on the dedicated authenticated AI route; shared navigation provides access without crowding dashboard or statistics.
- Progress exercise selection uses searchable, database-derived category groups; log proposal deletion targets suggested rows only and preserves completed work and AI history.
- Keep OAuth methods in a tested shared auth-provider module; sign-in lives only on "/" (/auth redirects), so restrictions stay consistent.
- Generate training insights only on an explicit request through an authenticated server function, with user-scoped reads and server-only streamed AI Gateway Responses calls; keep computed facts separate from AI advice to protect log accuracy and avoid automatic billing.
- Validate custom training requests and normalize multi-workout plans in a shared pure module; scope cached results by request, language and gym to avoid showing another plan as the current answer.
- Workouts are rows in `workouts`; log_entries.workout_id is an optional FK, status separates plans from facts.
- Persist successful AI requests and full answers server-side in owner-scoped training_ai_history; shared history reads restore answers across pages, and unique history/workout/exercise links make individual and bulk acceptance idempotent without overwriting completed work.
- Store optional training background in owner-scoped training_profiles, separate from OAuth identity and existing goals; always pass the validated profile (incl. pace) to explicit AI calls as untrusted user-reported context, so sensitive profile data stays private by default.
- Derive approximate age at request time from profile birth year and request date; never infer birth year from legacy age because the birthday is unknown.
- Exercises, categories and gyms come only from the database (exercises/gyms tables), never from code constants — the user edits them in the app.
- Data is read client-side via the browser client + React Query under the `_authenticated` layout (ssr: false); RLS scopes log entries per user.
- Selected gym is stored in localStorage (`src/lib/gym.ts`); exercises show at a gym only when linked in exercise_locations, and no selected gym shows every exercise.
- Store exercise illustrations and localized field values on each database exercise; never use a code-keyed exercise bank in application code, so edits and new exercises remain data-driven.
- UI texts are i18next keys in src/locales/{lang}.json (sv source/fallback) typed from sv.json and read via useLanguage().t or i18n.getFixedT on the server; never inline sv/en pairs, so languages can be added without touching components.
- Use the shared language context for Swedish/English UI and browser language persistence; preserve original user notes and exercise fields while storing translations separately.
- Render flag-only language controls through the shared LanguagePicker with image assets, not emoji, because desktop platforms may display country letters instead of flags.
- Derive progress charts client-side through the shared progress aggregation module; compare weights per exercise and sum repeat counts per date so unrelated exercises and text loads are never mixed into weight trends.

- Keep app branding in shared global CSS tokens and the shared masthead, which links to Home from every page; all content routes inherit the same visual frame so changes stay consistent across pages.
- Category surfaces use shared data-category themes with separate fill, ink, on-fill and chart tokens; this keeps category accents consistent, text legible on bright fills and charts readable on white.
- Sort rows within displayed workout dates by recording timestamp ascending without changing the newest-first shared log query, so latest-set prefills remain correct.
- Derive the Home logo and favicon from the same logo artwork; use only the circular badge for the favicon so it stays legible at browser-tab sizes.
- Use canonical English file routes for app navigation and retain legacy Swedish routes only as redirects, preserving exercise codes and workout filters so existing bookmarks continue working.
- AI plans carry an optional startDate in the validated request and use the plan's chosen location (name/description as untrusted context); available exercises come from the owner-scoped exercise_locations link table (shared helpers in src/lib/exercise-locations.ts), with no location meaning all.
- Location photo scans run only on explicit request via an authenticated server function; AI output only toggles existing exercise_locations links (plus an equipment note in the location description), so planning keeps using the same link table.
- log_entries.exercise_id is the real FK to exercises (ON DELETE RESTRICT); DB triggers fill it from code on insert and cascade code renames to log rows, so renames never orphan history.
- Exercises used by any log row are hidden via exercises.is_active=false instead of deleted; Train, AI planning and photo scans offer active exercises only.
- Exercise pictures live in the private exercise-images storage bucket as "storage:<path>" refs resolved to signed URLs; AI pictures are generated only on explicit click via an authenticated server function.
- Planned workouts (AI or own, status suggested) live on the Train page with circuit mode logging one completed set per exercise per lap; the Log page shows completed history only, keeping facts separate from plans.
- Exercise bank: all read, admin (user_roles) writes; one CircuitRunner with circuit toggle.
- Admin inspection retains actor auth; session-scoped RLS selects the target, blocks writes, and audits start/end. Future write support needs explicit capabilities and operation audits.
