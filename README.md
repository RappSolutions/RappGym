# ![logo](./src/assets/RappGym_64.png) RappGym

A mobile-first training log for a home gym (Gymstick HomeGym 3.0 and other locations). Browse illustrated exercise instructions, plan workouts (yourself or with AI), run them as circuits, log every set and follow your progress over time.

Live: https://gym.rappsol.com

## Features

- **Exercise bank:** stored in the database and edited in the app (codes such as `LE6`, `PU1`), with categories, illustrations, Swedish/English text and per-location availability.
- **Train:** planned workouts (own or AI) with a guided circuit runner. Each lap logs one completed set per exercise, and you can adjust loads between laps.
- **Log:** completed facts only, grouped per workout with ISO dates and weekday. "Plan again" copies a workout with a new name, date, location and circuit setting.
- **Statistics:** weight and set trends per exercise, filtered by location and period. Planned work is never counted.
- **AI:** analysis and structured workout planning through Lovable AI Gateway, on explicit request only. It keeps a persistent history and uses finite per-user quotas.
- **Home:** dashboard with key figures, the ongoing or today's workout, and soft goals.
- **Access:** sign in with Google or Microsoft only. A global admin manages exercises, locations and users. Everyone else is a normal user who sees only their own data.
- **Admin user view:** view an ordinary user's app read-only, retaining the admin identity. A persistent banner ends the view; session-scoped database rules block writes and audit start/end. Future support writes require explicit capabilities and operation-level auditing.

## Principles

- Plans (`workout_exercises`) and completed facts (`log_entries`) live in separate tables. Completed history is never rewritten retroactively.
- Every delete requires confirmation.
- Dates are always ISO 8601 (`YYYY-MM-DD`).
- The relational model is normalized and uses real foreign keys. Row-level security scopes personal data to its owner.

## Tech stack

- TanStack Start (React 19, Vite 7) running on an edge runtime
- Tailwind CSS v4 with semantic design tokens in `src/styles.css`
- PostgreSQL with row-level security, auth and storage on Lovable Cloud
- React Query for client-side data reads
- Lovable AI Gateway for training insights and exercise pictures
- Vitest for tests of the pure domain modules in `src/lib`

## Getting started

```sh
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # run the test suite
```

| Path | Contents |
| --- | --- |
| `src/routes/` | Pages. English URLs; legacy Swedish URLs redirect. |
| `src/components/gym/` | Feature components (runner, builder, log sheet, AI) |
| `src/lib/` | Pure domain logic, queries and server functions (`*.functions.ts`) |
| `drizzle/migrations/` | SQL migrations, the source of truth for the schema |
| `supabase/schema.puml` | PlantUML data model, kept in sync with the migrations |

## Usage

1. Sign in, then pick your location from the avatar menu.
2. **Train:** start a new workout or open a planned one, then press *Start workout*. Toggle *Run as circuit* to go lap by lap.
3. **Log:** review completed workouts, press the repeat icon to plan one again, or the trash icon to delete it (with confirmation).
4. **AI:** choose the number of workouts, days, purpose, length, location and start date, then accept the suggestions you want. They appear under Train.
5. **Settings** (admin only, via the avatar): locations, exercises and users.

## Data model

The full PlantUML model lives in [`supabase/schema.puml`](supabase/schema.puml). Below is the same model as a Mermaid diagram, which GitHub renders.

```mermaid
erDiagram
  USERS ||--o{ USER_ROLES : has
  USERS ||--o{ ADMIN_USER_VIEWS : "actor / target"
  USERS ||--o{ GYMS : owns
  USERS ||--o{ WORKOUTS : owns
  USERS ||--o{ LOG_ENTRIES : owns
  USERS ||--o{ TRAINING_AI_HISTORY : owns
  USERS ||--o{ TRAINING_GOALS : owns
  USERS ||--o| TRAINING_PROFILES : has
  GYMS ||--o{ GYM_EQUIPMENT : "CASCADE"
  EXERCISE_EQUIPMENT ||--o{ GYM_EQUIPMENT : "RESTRICT"
  EXERCISES ||--o{ LOG_ENTRIES : "RESTRICT"
  EXERCISES ||--o{ WORKOUT_EXERCISES : "RESTRICT"
  WORKOUTS ||--o{ WORKOUT_EXERCISES : "CASCADE"
  EXERCISE_CATEGORIES ||--o{ EXERCISES : "RESTRICT"
  EXERCISE_EQUIPMENT |o--o{ EXERCISES : "RESTRICT"
  USERS ||--o{ EXERCISE_SUGGESTIONS : proposes
  EXERCISE_CATEGORIES |o--o{ EXERCISE_SUGGESTIONS : "RESTRICT"
  EXERCISE_EQUIPMENT |o--o{ EXERCISE_SUGGESTIONS : "RESTRICT"
  EXERCISE_SUGGESTIONS {
    uuid id PK
    uuid user_id
    text name
    uuid category_id FK
    uuid equipment_id FK
    text instructions
    text source_url
    timestamptz created_at
  }
  WORKOUTS |o--o{ LOG_ENTRIES : "SET NULL"
  GYMS |o--o{ LOG_ENTRIES : "performed at"
  GYMS |o--o{ WORKOUTS : "planned at"
  TRAINING_AI_HISTORY |o--o{ WORKOUTS : "accepted from"
  WORKOUTS |o--o{ WORKOUTS : "copied from"

  USER_ROLES {
    uuid id PK
    uuid user_id FK
    app_role role
  }
  ADMIN_USER_VIEWS {
    uuid id PK
    uuid auth_session_id "unique while active"
    uuid actor_id
    uuid target_user_id
    timestamptz started_at
    timestamptz ended_at
  }
  GYMS {
    uuid id PK
    uuid user_id
    text name
    text description
    boolean is_public
    boolean is_default "unique when true"
  }
  EXERCISES {
    uuid id PK
    text code UK
    text name
    uuid category_id FK
    uuid equipment_id FK
    text reps_unit "reps|sec|min"
    text instructions
    jsonb image_urls
    jsonb translations
    boolean is_active
  }
  EXERCISE_CATEGORIES {
    uuid id PK
    text name UK
    text code_prefix UK
    text color_token
    int sort_order
  }
  EXERCISE_EQUIPMENT {
    uuid id PK
    text name UK
  }
  GYM_EQUIPMENT {
    uuid gym_id PK, FK
    uuid equipment_id PK, FK
    numeric max_load_kg
  }
  WORKOUTS {
    uuid id PK
    uuid user_id
    text title
    text created_by "user | ai"
    date scheduled_date
    uuid gym_id FK
    boolean is_circuit
    boolean is_spontaneous
    uuid ai_history_id FK
    uuid source_workout_id FK
    timestamptz started_at
    timestamptz completed_at
    timestamptz created_at
  }
  WORKOUT_EXERCISES {
    uuid id PK
    uuid workout_id FK
    uuid exercise_id FK
    text phase "intro | main | outro"
    int sort_order
    int target_sets
    int target_reps
    text target_load
    text note
  }
  LOG_ENTRIES {
    uuid id PK
    uuid user_id
    uuid workout_id FK
    uuid exercise_id FK
    date date
    text status "completed"
    int sets
    int reps
    text load
    text note
    smallint effort "1-5, nullable"
    uuid gym_id FK
    text phase "intro | main | outro"
    smallint lap "actual circuit lap; NULL for legacy"
    smallint set_number "actual set ordinal; NULL for legacy"
  }
  TRAINING_AI_HISTORY {
    uuid id PK
    uuid user_id
    jsonb request
    jsonb insights
    int input_tokens
    int output_tokens
    numeric cost_usd
    timestamptz generated_at
  }
  TRAINING_GOALS {
    uuid id PK
    uuid user_id
    text text
    date target_date
    text status
    timestamptz created_at
  }
  TRAINING_PROFILES {
    uuid user_id PK
    int birth_year
    text pace
    boolean use_for_ai
  }
  AI_TIERS ||--o{ USER_MEMBERSHIPS : "RESTRICT"
  AI_TIERS ||--o{ BILLING_SUBSCRIPTIONS : "RESTRICT"
  BILLING_ACCOUNTS ||--o{ BILLING_SUBSCRIPTIONS : "CASCADE"
  USER_MEMBERSHIPS {
    uuid user_id PK
    text tier_id FK
    date starts_on
    date ends_on "CHECK >= starts_on"
    text stripe_reference UK
    uuid verified_by
    timestamptz verified_at
  }
  BILLING_ACCOUNTS {
    uuid user_id PK
    text stripe_customer_id UK
  }
  BILLING_SUBSCRIPTIONS {
    text stripe_subscription_id PK
    uuid user_id FK
    text tier_id FK
    text stripe_price_id
    text status
    timestamptz period_end
    boolean cancel_at_period_end
    timestamptz updated_at
  }
  AI_TIERS {
    text id PK
    text name
    int monthly_ai_quota
    boolean is_default
  }
  USER_CONSENTS {
    uuid user_id PK
    int terms_version PK
    timestamptz consented_at
  }
```


## Adding a language (i18n)

Example: Finnish, ISO 639-1 code `fi`. Translating texts is a separate later step.

1. **Locale file:** copy `src/locales/en.json` to `src/locales/fi.json`. Keys must match `sv.json` (the typed source); values may stay untranslated.
2. **Registration:** in `src/lib/i18n-core.ts`, import `fi.json`, add `fi: { translation: fi }` to `resources` and `"fi"` to `supportedLanguages`.
3. **Flag:** upload a flag SVG as a lovable asset into `src/assets/flags/` (e.g. `finland.svg.asset.json`), import it in `src/lib/i18n.tsx` and add it to `LanguagePicker` (it currently lists `["sv", "en"]` and picks flag/label inline; extend both). Use image assets, not emoji flags.
4. **Server functions:** add `"fi"` to `language: z.enum([...])` in `src/lib/training-insights.functions.ts`, `src/lib/location-scan.functions.ts` and `src/lib/user-view.functions.ts`.
5. **Database:** no migration. Exercises, categories and equipment store English in base columns and other languages in `translations` jsonb keyed by language code (`{ "fi": { "name": "..." } }`). The category/equipment dialog shows one field per entry in `supportedLanguages` automatically.
6. Run typecheck and tests.

## Public pages, memberships and launch

- `/about`, `/features`, `/membership` and `/exercises` are public English pages; `/exercise-bank` retains the signed-in exercise workflow.
- New ordinary users start at Gymmet with all equipment. Active supporters manage private locations in Settings.
- Users can delete their account from the avatar menu; admins can search users and verify manual Stripe payments by account ID and date range.
- Stripe Checkout/webhook code is prepared but charging is disabled pending approved product/price, VAT and webhook configuration.
- See [LAUNCH.md](LAUNCH.md) for setup, pricing proposal, LinkedIn copy, legal checks and remaining security/verification work.
