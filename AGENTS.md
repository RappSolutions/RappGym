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
- Keep supported OAuth methods in a shared auth-provider module used by the sign-in page and tested, so authentication restrictions stay consistent.
- Generate training insights only on an explicit request through an authenticated server function, with user-scoped reads and server-only streamed AI Gateway Responses calls; keep computed facts separate from AI advice to protect log accuracy and avoid automatic billing.
- Exercises, categories and gyms come only from the database (exercises/gyms tables), never from code constants — the user edits them in the app.
- Data is read client-side via the browser client + React Query under the `_authenticated` layout (ssr: false); RLS scopes log entries per user.
- Selected gym is stored in localStorage (`src/lib/gym.ts`); exercises with no gym show at every gym.
- Store exercise illustrations and localized field values on each database exercise; never use a code-keyed exercise bank in application code, so edits and new exercises remain data-driven.
- Use the shared language context for Swedish/English UI and browser language persistence; preserve original user notes and exercise fields while storing translations separately.
- Derive progress charts client-side through the shared progress aggregation module; compare weights per exercise and sum repeat counts per date so unrelated exercises and text loads are never mixed into weight trends.

- Keep app branding in shared global CSS tokens and the shared masthead, which links to Home from every page; all content routes inherit the same visual frame so changes stay consistent across pages.
- Category surfaces use shared data-category themes with separate fill, ink, on-fill and chart tokens; this keeps category accents consistent, text legible on bright fills and charts readable on white.
- Sort rows within displayed workout dates by recording timestamp ascending without changing the newest-first shared log query, so latest-set prefills remain correct.
- Derive the Home logo and favicon from the same logo artwork; use only the circular badge for the favicon so it stays legible at browser-tab sizes.
- Use canonical English file routes for app navigation and retain legacy Swedish routes only as redirects, preserving exercise codes and workout filters so existing bookmarks continue working.
- Home dashboard numbers come from the pure `src/lib/dashboard.ts` module (tested); soft training goals live in the owner-scoped `training_goals` table and are passed to the AI insight call as untrusted data, so AI advice can reflect goals without trusting them as instructions.
