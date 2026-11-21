DROP POLICY IF EXISTS "read all" ON public.exercises;
CREATE POLICY "signed-in read exercise bank" ON public.exercises FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);