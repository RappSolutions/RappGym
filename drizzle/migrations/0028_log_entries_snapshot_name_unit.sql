ALTER TABLE public.log_entries ADD COLUMN exercise_name text, ADD COLUMN reps_unit text;
UPDATE public.log_entries l SET exercise_name = e.name, reps_unit = e.reps_unit FROM public.exercises e WHERE e.id = l.exercise_id;
UPDATE public.log_entries SET exercise_name = code WHERE exercise_name IS NULL;
UPDATE public.log_entries SET reps_unit = 'reps' WHERE reps_unit IS NULL;
ALTER TABLE public.log_entries ALTER COLUMN exercise_name SET DEFAULT '', ALTER COLUMN reps_unit SET DEFAULT 'reps';
ALTER TABLE public.log_entries ALTER COLUMN exercise_name SET NOT NULL, ALTER COLUMN reps_unit SET NOT NULL;
ALTER TABLE public.log_entries ADD CONSTRAINT log_entries_reps_unit_check CHECK (reps_unit IN ('reps','sec','min'));

CREATE OR REPLACE FUNCTION public.log_entries_sync_exercise()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE _id uuid;
BEGIN
  -- Completed rows are frozen receipts: code/name/unit only change if the exercise itself is swapped.
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'completed' THEN
    NEW.exercise_name := OLD.exercise_name; NEW.reps_unit := OLD.reps_unit;
    IF NEW.code IS DISTINCT FROM OLD.code AND NEW.exercise_id IS NOT DISTINCT FROM OLD.exercise_id THEN
      SELECT id INTO _id FROM public.exercises WHERE code = NEW.code;
      IF _id IS NULL OR _id = OLD.exercise_id THEN NEW.code := OLD.code; ELSE NEW.exercise_id := _id; END IF;
    END IF;
    IF NEW.exercise_id IS DISTINCT FROM OLD.exercise_id THEN
      SELECT code, name, reps_unit INTO NEW.code, NEW.exercise_name, NEW.reps_unit FROM public.exercises WHERE id = NEW.exercise_id;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.exercise_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.code IS DISTINCT FROM OLD.code AND NEW.exercise_id IS NOT DISTINCT FROM OLD.exercise_id) THEN
    SELECT id INTO NEW.exercise_id FROM public.exercises WHERE code = NEW.code;
  END IF;
  IF NEW.exercise_id IS NOT NULL THEN
    SELECT code, name, reps_unit INTO NEW.code, NEW.exercise_name, NEW.reps_unit FROM public.exercises WHERE id = NEW.exercise_id;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.exercises_cascade_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code OR NEW.name IS DISTINCT FROM OLD.name OR NEW.reps_unit IS DISTINCT FROM OLD.reps_unit THEN
    UPDATE public.log_entries SET code = NEW.code, exercise_name = NEW.name, reps_unit = NEW.reps_unit WHERE exercise_id = NEW.id AND status = 'suggested';
  END IF;
  RETURN NEW;
END $function$;