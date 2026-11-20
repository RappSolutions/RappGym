CREATE TABLE public.user_exercise_preferences (
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5 AND rating <> 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);
COMMENT ON TABLE public.user_exercise_preferences IS 'Sparse per-user AI priority per exercise: 1 never (hard filter), 2 rarely, 4 often, 5 always (mandatory when it fits). Missing row = 3 normal. Affects AI planning only.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_exercise_preferences TO authenticated;
GRANT ALL ON public.user_exercise_preferences TO service_role;
ALTER TABLE public.user_exercise_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own preferences readable" ON public.user_exercise_preferences FOR SELECT TO authenticated USING (user_id = (SELECT public.effective_user_id()));
CREATE POLICY "Own preferences insert" ON public.user_exercise_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own preferences update" ON public.user_exercise_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own preferences delete" ON public.user_exercise_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "No writes during user view (insert)" ON public.user_exercise_preferences AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.user_view_active());
CREATE POLICY "No writes during user view (update)" ON public.user_exercise_preferences AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.user_view_active());
CREATE POLICY "No writes during user view (delete)" ON public.user_exercise_preferences AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.user_view_active());