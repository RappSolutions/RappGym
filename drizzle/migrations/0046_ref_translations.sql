ALTER TABLE public.exercise_categories ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.exercise_equipment ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.exercise_categories.translations IS 'Per-language overrides keyed by ISO 639-1, e.g. {"sv":{"name":"..."}}; base name is English.';
COMMENT ON COLUMN public.exercise_equipment.translations IS 'Per-language overrides keyed by ISO 639-1, e.g. {"sv":{"name":"..."}}; base name is English.';
COMMENT ON COLUMN public.exercises.translations IS 'Per-language overrides keyed by ISO 639-1, e.g. {"sv":{"name":"...","instructions":"..."}}; base name/instructions are English.';