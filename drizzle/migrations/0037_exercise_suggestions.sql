CREATE TABLE public.exercise_suggestions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
 category_id uuid REFERENCES public.exercise_categories(id) ON DELETE RESTRICT,
 equipment_id uuid REFERENCES public.exercise_equipment(id) ON DELETE RESTRICT,
 instructions text NOT NULL CHECK (char_length(btrim(instructions)) BETWEEN 1 AND 4000),
 source_url text CHECK (source_url IS NULL OR (char_length(source_url) <= 2000 AND source_url ~ '^https?://')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exercise_suggestions TO authenticated;
GRANT ALL ON public.exercise_suggestions TO service_role;
ALTER TABLE public.exercise_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own suggestions insert" ON public.exercise_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.user_view_active());
CREATE POLICY "Owner or admin suggestions read" ON public.exercise_suggestions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX exercise_suggestions_user_created ON public.exercise_suggestions(user_id, created_at DESC);