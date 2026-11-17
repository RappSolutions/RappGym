DROP POLICY IF EXISTS "read all" ON public.gyms;
CREATE POLICY "signed in read" ON public.gyms FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.gyms FROM anon;