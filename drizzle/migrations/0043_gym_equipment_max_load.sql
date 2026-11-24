ALTER TABLE public.gym_equipment ADD COLUMN max_load_kg numeric(6,1) NULL CHECK (max_load_kg IS NULL OR max_load_kg > 0);
COMMENT ON COLUMN public.gym_equipment.max_load_kg IS 'Max available load at this location for this equipment; NULL = unknown/unlimited';
DROP POLICY IF EXISTS "gym_equipment admin update" ON public.gym_equipment;
GRANT UPDATE ON public.gym_equipment TO authenticated;
CREATE POLICY "gym_equipment admin update" ON public.gym_equipment FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') AND NOT public.user_view_active())
WITH CHECK (public.has_role(auth.uid(),'admin') AND NOT public.user_view_active());