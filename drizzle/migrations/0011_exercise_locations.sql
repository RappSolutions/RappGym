CREATE TABLE public.exercise_locations (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, gym_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_locations TO authenticated;
GRANT ALL ON public.exercise_locations TO service_role;
ALTER TABLE public.exercise_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.exercise_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.exercise_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id AND g.user_id = auth.uid()));
CREATE POLICY "own delete" ON public.exercise_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
INSERT INTO public.exercise_locations (exercise_id, gym_id, user_id)
SELECT e.id, g.id, e.user_id FROM public.exercises e JOIN public.gyms g ON g.user_id = e.user_id;
COMMENT ON COLUMN public.exercises.gym_id IS 'DEPRECATED: replaced by exercise_locations';