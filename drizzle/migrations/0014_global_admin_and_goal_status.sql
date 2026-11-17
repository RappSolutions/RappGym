CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

INSERT INTO public.user_roles (user_id, role) VALUES ('8ed19427-a2b1-4f8e-8d47-b17f3c644de1', 'admin');

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['exercises','gyms','exercise_locations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "own select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "read all" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "admin insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admin delete" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;
CREATE POLICY "admin update" ON public.exercises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.gyms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_entries_sync_exercise()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.exercise_id IS NOT NULL THEN
    SELECT code INTO NEW.code FROM public.exercises WHERE id = NEW.exercise_id;
  ELSE
    SELECT id INTO NEW.exercise_id FROM public.exercises WHERE code = NEW.code;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.exercises_cascade_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    UPDATE public.log_entries SET code = NEW.code WHERE exercise_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

UPDATE public.training_goals SET status = 'fulfilled' WHERE status = 'done';
