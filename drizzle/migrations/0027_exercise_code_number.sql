ALTER TABLE public.exercises ADD COLUMN code_number integer;
UPDATE public.exercises e SET code_number = substring(e.code from '([0-9]+)$')::int;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_code_number_positive CHECK (code_number > 0);
ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_code_number_key UNIQUE (category_id, code_number);

-- Code is always derived: category prefix + number. Missing number = next free in category.
CREATE OR REPLACE FUNCTION public.exercises_derive_code()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _prefix text;
BEGIN
  SELECT code_prefix INTO _prefix FROM public.exercise_categories WHERE id = NEW.category_id;
  IF NEW.code_number IS NULL THEN
    SELECT COALESCE(max(code_number), 0) + 1 INTO NEW.code_number FROM public.exercises WHERE category_id = NEW.category_id AND id <> NEW.id;
  END IF;
  NEW.code := _prefix || NEW.code_number::text;
  RETURN NEW;
END $$;
CREATE TRIGGER exercises_derive_code BEFORE INSERT OR UPDATE OF code, code_number, category_id ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.exercises_derive_code();
ALTER TABLE public.exercises ALTER COLUMN code_number SET NOT NULL;

-- Prefix change on a category re-derives its exercises' codes.
CREATE OR REPLACE FUNCTION public.exercise_categories_cascade_prefix()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.code_prefix IS DISTINCT FROM OLD.code_prefix THEN
    UPDATE public.exercises SET code = NEW.code_prefix || code_number::text WHERE category_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exercise_categories_cascade_prefix AFTER UPDATE OF code_prefix ON public.exercise_categories
FOR EACH ROW EXECUTE FUNCTION public.exercise_categories_cascade_prefix();

-- Renames follow planned rows only; completed rows keep the code they were recorded with.
CREATE OR REPLACE FUNCTION public.exercises_cascade_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    UPDATE public.log_entries SET code = NEW.code WHERE exercise_id = NEW.id AND status = 'suggested';
  END IF;
  RETURN NEW;
END $$;

-- Completed rows freeze their code; it is only replaced when the row is moved to another exercise.
CREATE OR REPLACE FUNCTION public.log_entries_sync_exercise()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'completed' THEN
    IF NEW.exercise_id IS DISTINCT FROM OLD.exercise_id THEN
      SELECT code INTO NEW.code FROM public.exercises WHERE id = NEW.exercise_id;
    ELSIF NEW.code IS DISTINCT FROM OLD.code THEN
      SELECT id INTO _id FROM public.exercises WHERE code = NEW.code;
      IF _id IS NULL OR _id = OLD.exercise_id THEN NEW.code := OLD.code;
      ELSE NEW.exercise_id := _id; END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.exercise_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.exercise_id IS DISTINCT FROM OLD.exercise_id OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT code INTO NEW.code FROM public.exercises WHERE id = NEW.exercise_id;
  ELSIF NEW.exercise_id IS NULL OR NEW.code IS DISTINCT FROM OLD.code THEN
    SELECT id INTO NEW.exercise_id FROM public.exercises WHERE code = NEW.code;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS log_entries_sync_exercise ON public.log_entries;
CREATE TRIGGER log_entries_sync_exercise BEFORE INSERT OR UPDATE OF code, exercise_id, status ON public.log_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entries_sync_exercise();

COMMENT ON COLUMN public.exercises.code IS 'Derived: category.code_prefix || code_number (trigger); never set directly';
COMMENT ON COLUMN public.log_entries.code IS 'Planned rows: current exercise code. Completed rows: code as recorded, frozen';