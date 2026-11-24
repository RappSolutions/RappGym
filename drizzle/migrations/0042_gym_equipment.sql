CREATE TABLE public.gym_equipment (
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.exercise_equipment(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gym_id, equipment_id)
);
CREATE INDEX gym_equipment_equipment_idx ON public.gym_equipment(equipment_id);
GRANT SELECT, INSERT, DELETE ON public.gym_equipment TO authenticated;
GRANT ALL ON public.gym_equipment TO service_role;
ALTER TABLE public.gym_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visible gym read" ON public.gym_equipment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_id));
CREATE POLICY "admin insert" ON public.gym_equipment FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.gym_equipment FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user view blocks insert" ON public.gym_equipment AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT (SELECT public.user_view_active()));
CREATE POLICY "user view blocks delete" ON public.gym_equipment AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT (SELECT public.user_view_active()));

UPDATE public.exercise_equipment SET name = 'Kabelmaskin' WHERE id = '5f008a4d-37c9-4673-9677-75fb7df361c6';
INSERT INTO public.exercise_equipment(name) VALUES ('Bröstpress'),('Benpress'),('Benspark'),('Bencurl'),('Pec Deck'),('Scott-bänk')
  ON CONFLICT (name) DO NOTHING;
UPDATE public.exercises e SET equipment_id = q.id
FROM (VALUES ('PU1','Bröstpress'),('LE6','Benpress'),('LE2','Benspark'),('LE7','Benspark'),('LE4','Bencurl'),('PU8','Pec Deck'),('PU9','Pec Deck'),('PL7','Scott-bänk')) m(code, eq)
JOIN public.exercise_equipment q ON q.name = m.eq
WHERE e.code = m.code;

INSERT INTO public.gym_equipment(gym_id, equipment_id)
SELECT DISTINCT l.gym_id, e.equipment_id FROM public.exercise_locations l
JOIN public.exercises e ON e.id = l.exercise_id WHERE e.equipment_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO public.gym_equipment(gym_id, equipment_id)
SELECT 'bc141cfc-f070-4c83-871e-b4d23f6599c5', id FROM public.exercise_equipment WHERE name = 'Benspark'
  AND EXISTS (SELECT 1 FROM public.gyms WHERE id = 'bc141cfc-f070-4c83-871e-b4d23f6599c5')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.exercise_locations IS 'DEPRECATED: replaced by gym_equipment (exercise available where its equipment is, or always when equipment_id IS NULL)';