ALTER TABLE public.exercise_categories DROP CONSTRAINT IF EXISTS exercise_categories_color_token_check;
ALTER TABLE public.exercise_categories ADD CONSTRAINT exercise_categories_color_token_check CHECK (color_token ~ '^(cat-[0-9]+|#[0-9a-f]{6})$');
COMMENT ON COLUMN public.exercise_categories.color_token IS 'Theme token cat-N (legacy palette) or lowercase hex #rrggbb';