# Translations

UI texts live in one JSON file per language under `src/locales/` (`sv.json` is the source and fallback, `en.json`, ...).
Keys are grouped per screen/component (`log.*`, `settings.*`), shared texts under `common.*`, server messages under `server.*`.

- In components: `const { t } = useLanguage(); t("log.noEntries")`, interpolation `t("x.y", { count })` with `{{count}}` in the JSON.
- Keys are type-checked against `sv.json`; a missing or misspelled key fails the build.
- `src/test/locales.test.ts` fails when a language file lacks or adds keys.
- New language: copy `sv.json` to e.g. `no.json`, translate values (never keys or `{{placeholders}}`), register it in `src/lib/i18n-core.ts` and the language picker.
- Translators can edit the JSON in GitHub's web editor or via Crowdin/Weblate connected to the repo.
- Exercise names/instructions are data and stay in the database `translations` column.
