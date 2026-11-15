CREATE TABLE public.training_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  text text NOT NULL,
  target_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_goals TO authenticated;
GRANT ALL ON public.training_goals TO service_role;
ALTER TABLE public.training_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.training_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.training_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.training_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.training_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);