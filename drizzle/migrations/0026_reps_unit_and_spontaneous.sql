ALTER TABLE public.exercises ADD COLUMN reps_unit text NOT NULL DEFAULT 'reps';
ALTER TABLE public.exercises ADD CONSTRAINT exercises_reps_unit_check CHECK (reps_unit IN ('reps','sec','min'));
ALTER TABLE public.workouts ADD COLUMN is_spontaneous boolean NOT NULL DEFAULT false;
UPDATE public.workouts SET is_spontaneous = true WHERE title LIKE 'Spontanpass %' OR title LIKE 'Spontaneous workout %';
COMMENT ON COLUMN public.exercises.reps_unit IS 'What log_entries.reps counts for this exercise: reps, sec or min';