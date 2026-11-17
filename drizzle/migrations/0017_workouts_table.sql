CREATE TABLE public.workouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL,
 created_by text NOT NULL DEFAULT 'user' CHECK (created_by IN ('user','ai')),
 scheduled_date date,
 gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
 is_circuit boolean NOT NULL DEFAULT true,
 ai_history_id uuid REFERENCES public.training_ai_history(id) ON DELETE SET NULL,
 ai_workout_key text,
 source_workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
 note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX workouts_owner_date ON public.workouts(user_id, scheduled_date DESC);

INSERT INTO public.workouts (id, user_id, title, created_by, scheduled_date, gym_id, ai_history_id, ai_workout_key, created_at)
SELECT proposal_id, (array_agg(user_id))[1], coalesce(max(proposal_title), 'Pass'),
 CASE WHEN bool_or(ai_history_id IS NOT NULL) THEN 'ai' ELSE 'user' END,
 min(date), (array_agg(gym_id) FILTER (WHERE gym_id IS NOT NULL))[1],
 (array_agg(ai_history_id) FILTER (WHERE ai_history_id IS NOT NULL))[1],
 (array_agg(ai_workout_key) FILTER (WHERE ai_workout_key IS NOT NULL))[1], min(created_at)
FROM public.log_entries WHERE proposal_id IS NOT NULL GROUP BY proposal_id;

ALTER TABLE public.log_entries ADD COLUMN workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL;
UPDATE public.log_entries SET workout_id = proposal_id WHERE proposal_id IS NOT NULL;
CREATE INDEX log_entries_workout ON public.log_entries(workout_id);
CREATE UNIQUE INDEX workouts_ai_acceptance ON public.workouts(user_id, ai_history_id, ai_workout_key) WHERE ai_history_id IS NOT NULL;

COMMENT ON COLUMN public.log_entries.proposal_id IS 'DEPRECATED: replaced by workout_id';
COMMENT ON COLUMN public.log_entries.proposal_title IS 'DEPRECATED: replaced by workouts.title';
COMMENT ON COLUMN public.log_entries.ai_history_id IS 'DEPRECATED: replaced by workouts.ai_history_id';
COMMENT ON COLUMN public.log_entries.ai_workout_key IS 'DEPRECATED: replaced by workouts.ai_workout_key';
COMMENT ON COLUMN public.log_entries.proposal_order IS 'Exercise order within its workout';

ALTER TABLE public.training_ai_history ADD COLUMN model text, ADD COLUMN input_tokens integer, ADD COLUMN output_tokens integer, ADD COLUMN cost_usd numeric;