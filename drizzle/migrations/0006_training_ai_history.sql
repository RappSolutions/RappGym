CREATE TABLE public.training_ai_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 generated_at timestamptz NOT NULL DEFAULT now(),
 language text NOT NULL CHECK (language IN ('sv', 'en')),
 gym_id uuid REFERENCES public.gyms(id),
 today date NOT NULL,
 request jsonb NOT NULL,
 insights jsonb NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_ai_history TO authenticated;
GRANT ALL ON public.training_ai_history TO service_role;
ALTER TABLE public.training_ai_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.training_ai_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.training_ai_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.training_ai_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.training_ai_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.log_entries ADD COLUMN ai_history_id uuid REFERENCES public.training_ai_history(id), ADD COLUMN ai_workout_key text;
CREATE UNIQUE INDEX log_entries_ai_suggestion_unique ON public.log_entries (user_id, ai_history_id, ai_workout_key, proposal_order) WHERE ai_history_id IS NOT NULL;
CREATE INDEX training_ai_history_owner_date ON public.training_ai_history(user_id, generated_at DESC);