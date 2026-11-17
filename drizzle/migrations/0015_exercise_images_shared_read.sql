DROP POLICY IF EXISTS "exercise images own select" ON storage.objects;
DROP POLICY IF EXISTS "exercise images own insert" ON storage.objects;
DROP POLICY IF EXISTS "exercise images own update" ON storage.objects;
DROP POLICY IF EXISTS "exercise images own delete" ON storage.objects;
CREATE POLICY "exercise images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exercise-images');
CREATE POLICY "exercise images admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exercise images admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exercise images admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));