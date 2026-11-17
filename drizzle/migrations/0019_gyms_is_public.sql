ALTER TABLE public.gyms ADD COLUMN is_public boolean NOT NULL DEFAULT false;
UPDATE public.gyms SET is_public = true WHERE is_public = false;
DROP POLICY IF EXISTS "signed in read" ON public.gyms;
CREATE POLICY "public owner or admin read" ON public.gyms FOR SELECT TO authenticated
USING (is_public OR (SELECT auth.uid()) = user_id OR public.has_role((SELECT auth.uid()), 'admin'::app_role));