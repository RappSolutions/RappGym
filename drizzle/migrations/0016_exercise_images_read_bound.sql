CREATE OR REPLACE FUNCTION public.is_exercise_image(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.exercises e WHERE e.image_urls @> to_jsonb(ARRAY['storage:' || _path]))
$$;
REVOKE EXECUTE ON FUNCTION public.is_exercise_image(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_exercise_image(text) TO authenticated;
DROP POLICY IF EXISTS "exercise images read" ON storage.objects;
CREATE POLICY "exercise images read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'exercise-images' AND (owner_id = auth.uid()::text OR public.has_role(auth.uid(), 'admin') OR public.is_exercise_image(name))
);