CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  phase text NOT NULL DEFAULT 'main' CHECK (phase IN ('intro','main','outro')),
  sort_order integer NOT NULL DEFAULT 0,
  target_sets integer NOT NULL DEFAULT 1 CHECK (target_sets >= 1),
  target_reps integer CHECK (target_reps IS NULL OR target_reps >= 0),
  target_load text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX workout_exercises_workout_idx ON public.workout_exercises (workout_id, phase, sort_order);
CREATE INDEX workout_exercises_exercise_idx ON public.workout_exercises (exercise_id);

CREATE POLICY "own select" ON public.workout_exercises FOR SELECT TO authenticated USING (user_id = (SELECT public.effective_user_id()));
CREATE POLICY "own insert" ON public.workout_exercises FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "own update" ON public.workout_exercises FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "own delete" ON public.workout_exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user view blocks insert" ON public.workout_exercises AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT public.user_view_active()));
CREATE POLICY "user view blocks update" ON public.workout_exercises AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT public.user_view_active())) WITH CHECK (NOT (SELECT public.user_view_active()));
CREATE POLICY "user view blocks delete" ON public.workout_exercises AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT (SELECT public.user_view_active()));

ALTER TABLE public.workouts ADD COLUMN started_at timestamptz, ADD COLUMN completed_at timestamptz;

-- Move plans out of the fact table.
INSERT INTO public.workout_exercises (id, user_id, workout_id, exercise_id, phase, sort_order, target_sets, target_reps, target_load, note, created_at)
SELECT l.id, l.user_id, l.workout_id, l.exercise_id, l.phase,
       coalesce(l.proposal_order, (row_number() OVER (PARTITION BY l.workout_id ORDER BY l.created_at))::int - 1),
       greatest(1, l.sets), l.reps, l.load, l.note, l.created_at
FROM public.log_entries l
WHERE l.status = 'suggested' AND l.workout_id IS NOT NULL AND l.exercise_id IS NOT NULL;

UPDATE public.workouts w SET completed_at = c.last
FROM (SELECT workout_id, max(created_at) last FROM public.log_entries WHERE status = 'completed' AND workout_id IS NOT NULL GROUP BY workout_id) c
WHERE w.id = c.workout_id AND NOT EXISTS (SELECT 1 FROM public.log_entries s WHERE s.workout_id = w.id AND s.status = 'suggested');

DELETE FROM public.log_entries WHERE status = 'suggested';

ALTER TABLE public.log_entries DROP CONSTRAINT log_entries_status_check;
ALTER TABLE public.log_entries ADD CONSTRAINT log_entries_status_check CHECK (status = 'completed');
ALTER TABLE public.log_entries ALTER COLUMN status SET DEFAULT 'completed';
COMMENT ON COLUMN public.log_entries.status IS 'Always completed; plans live in workout_exercises.';
COMMENT ON COLUMN public.log_entries.proposal_order IS 'DEPRECATED: plan order lives in workout_exercises.sort_order';

-- Plans follow exercise renames via the FK; log rows are no longer cascaded.
CREATE OR REPLACE FUNCTION public.exercises_cascade_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END $function$;