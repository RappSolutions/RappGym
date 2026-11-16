ALTER TABLE public.exercises ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.log_entries ADD COLUMN exercise_id uuid REFERENCES public.exercises(id) ON DELETE RESTRICT;
CREATE INDEX log_entries_exercise_id_idx ON public.log_entries(exercise_id);
UPDATE public.log_entries l SET exercise_id = e.id FROM public.exercises e WHERE e.user_id = l.user_id AND e.code = l.code AND l.exercise_id IS NULL;

CREATE OR REPLACE FUNCTION public.log_entries_sync_exercise()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.exercise_id IS NOT NULL THEN
    SELECT code INTO NEW.code FROM public.exercises WHERE id = NEW.exercise_id;
  ELSE
    SELECT id INTO NEW.exercise_id FROM public.exercises WHERE user_id = NEW.user_id AND code = NEW.code;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER log_entries_sync_exercise BEFORE INSERT OR UPDATE OF code, exercise_id ON public.log_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entries_sync_exercise();

CREATE OR REPLACE FUNCTION public.exercises_cascade_code()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    UPDATE public.log_entries SET code = NEW.code WHERE exercise_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exercises_cascade_code AFTER UPDATE OF code ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.exercises_cascade_code();

COMMENT ON COLUMN public.exercises.gym_id IS 'DEPRECATED: replaced by exercise_locations; no longer used by the app';