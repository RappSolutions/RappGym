ALTER TABLE public.log_entries ADD COLUMN exercise_rating smallint CHECK (exercise_rating BETWEEN 1 AND 5);

CREATE OR REPLACE FUNCTION public.log_entries_sync_exercise()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _id uuid;
BEGIN
  -- Completed rows are frozen receipts: code/name/unit/rating only change if the exercise itself is swapped (rating never).
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'completed' THEN
    NEW.exercise_name := OLD.exercise_name; NEW.reps_unit := OLD.reps_unit; NEW.exercise_rating := OLD.exercise_rating;
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
  -- Snapshot the user's AI priority at the moment the set becomes a fact; plans carry none.
  IF NEW.status = 'completed' THEN
    NEW.exercise_rating := coalesce((SELECT p.rating FROM public.user_exercise_preferences p WHERE p.user_id = NEW.user_id AND p.exercise_id = NEW.exercise_id), 3);
  ELSE
    NEW.exercise_rating := NULL;
  END IF;
  RETURN NEW;
END $function$;