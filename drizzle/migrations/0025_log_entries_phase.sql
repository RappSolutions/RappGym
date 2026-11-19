ALTER TABLE public.log_entries ADD COLUMN phase text NOT NULL DEFAULT 'main';
ALTER TABLE public.log_entries ADD CONSTRAINT log_entries_phase_check CHECK (phase IN ('intro','main','outro'));
COMMENT ON COLUMN public.log_entries.phase IS 'Workout phase: intro, main or outro; each phase runs as its own circuit/station block in order.';