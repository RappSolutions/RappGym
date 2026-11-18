CREATE TABLE public.exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  code_prefix text NOT NULL UNIQUE CHECK (code_prefix ~ '^[A-Z]{1,4}$'),
  color_token text NOT NULL DEFAULT 'cat-1' CHECK (color_token ~ '^cat-[0-9]+$'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_categories TO authenticated;
GRANT ALL ON public.exercise_categories TO service_role;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read" ON public.exercise_categories FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "admin insert" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.exercise_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.exercise_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.exercise_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_equipment TO authenticated;
GRANT ALL ON public.exercise_equipment TO service_role;
ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read" ON public.exercise_equipment FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "admin insert" ON public.exercise_equipment FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.exercise_equipment FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.exercise_equipment FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.exercise_categories (name, code_prefix, color_token, sort_order) VALUES
 ('Push','PU','cat-1',1),('Pull','PL','cat-2',2),('Legs','LE','cat-3',3),('Core','CO','cat-4',4),
 ('Power','PO','cat-5',5),('Kondition','CA','cat-6',6),('Rörlighet','MO','cat-7',7);

INSERT INTO public.exercise_equipment (name)
SELECT DISTINCT trim(equipment) FROM public.exercises WHERE trim(equipment) <> '';

ALTER TABLE public.exercises
  ADD COLUMN category_id uuid REFERENCES public.exercise_categories(id) ON DELETE RESTRICT,
  ADD COLUMN equipment_id uuid REFERENCES public.exercise_equipment(id) ON DELETE RESTRICT;
CREATE INDEX exercises_category_id_idx ON public.exercises(category_id);
CREATE INDEX exercises_equipment_id_idx ON public.exercises(equipment_id);

-- Yoga belongs to Rörlighet; FB1 is unused so the code move is safe (trigger cascades anyway).
UPDATE public.exercises SET category = 'Rörlighet', code = 'MO1' WHERE code = 'FB1' AND category = 'Full body';

UPDATE public.exercises e SET category_id = c.id FROM public.exercise_categories c WHERE c.name = e.category;
UPDATE public.exercises e SET equipment_id = q.id FROM public.exercise_equipment q WHERE q.name = trim(e.equipment);

-- Fold Anpassning/Fokus into Utförande so no text is lost.
UPDATE public.exercises SET instructions = concat_ws(E'\n\n', NULLIF(instructions,''),
  CASE WHEN variant <> '' THEN 'Anpassning: ' || variant END,
  CASE WHEN focus <> '' THEN 'Fokus: ' || focus END)
WHERE variant <> '' OR focus <> '';
UPDATE public.exercises SET translations = jsonb_set(translations, '{en,instructions}', to_jsonb(concat_ws(E'\n\n',
  NULLIF(translations->'en'->>'instructions',''),
  CASE WHEN coalesce(translations->'en'->>'variant','') <> '' THEN 'Variation: ' || (translations->'en'->>'variant') END,
  CASE WHEN coalesce(translations->'en'->>'focus','') <> '' THEN 'Focus: ' || (translations->'en'->>'focus') END)))
WHERE jsonb_typeof(translations->'en') = 'object'
  AND (coalesce(translations->'en'->>'variant','') <> '' OR coalesce(translations->'en'->>'focus','') <> '');

ALTER TABLE public.exercises ALTER COLUMN category SET DEFAULT '';
COMMENT ON COLUMN public.exercises.category IS 'DEPRECATED: replaced by category_id';
COMMENT ON COLUMN public.exercises.equipment IS 'DEPRECATED: replaced by equipment_id';
COMMENT ON COLUMN public.exercises.dose IS 'DEPRECATED: sets/reps/load prefill from latest logged set';
COMMENT ON COLUMN public.exercises.variant IS 'DEPRECATED: folded into instructions';
COMMENT ON COLUMN public.exercises.focus IS 'DEPRECATED: folded into instructions';
COMMENT ON COLUMN public.exercises.muscles IS 'DEPRECATED: category covers it';