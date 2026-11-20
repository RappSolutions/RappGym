ALTER TABLE public.training_profiles DROP COLUMN age;
ALTER TABLE public.log_entries DROP COLUMN proposal_id, DROP COLUMN proposal_title, DROP COLUMN ai_history_id, DROP COLUMN ai_workout_key;
ALTER TABLE public.exercises DROP COLUMN category, DROP COLUMN equipment, DROP COLUMN variant, DROP COLUMN muscles, DROP COLUMN dose, DROP COLUMN focus, DROP COLUMN gym_id;