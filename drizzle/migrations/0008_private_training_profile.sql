CREATE TABLE public.training_profiles (
 user_id uuid PRIMARY KEY DEFAULT auth.uid(),
 age integer CHECK (age BETWEEN 1 AND 120),
 height_cm numeric CHECK (height_cm BETWEEN 30 AND 300),
 weight_kg numeric CHECK (weight_kg BETWEEN 1 AND 500),
 experience text NOT NULL DEFAULT '',
 preferences text NOT NULL DEFAULT '',
 limitations text NOT NULL DEFAULT '',
 use_for_ai boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_profiles TO authenticated;
GRANT ALL ON public.training_profiles TO service_role;
ALTER TABLE public.training_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.training_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.training_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.training_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.training_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);