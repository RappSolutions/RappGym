ALTER TABLE public.user_memberships ADD COLUMN note text CONSTRAINT membership_note_length CHECK (char_length(note) <= 255);
CREATE OR REPLACE FUNCTION public.set_manual_membership(_user_id uuid, _starts_on date, _ends_on date, _stripe_reference text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _reference text := nullif(btrim(_stripe_reference),''); _clean_note text := nullif(btrim(_note),'');
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.user_view_active() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'Unknown user'; END IF;
 IF _starts_on IS NULL OR _ends_on IS NULL OR _ends_on < _starts_on OR _starts_on > current_date OR _ends_on < current_date OR (_reference IS NOT NULL AND (char_length(_reference)<3 OR char_length(_reference)>255)) OR char_length(_clean_note)>255 THEN RAISE EXCEPTION 'Invalid membership'; END IF;
 INSERT INTO public.user_memberships(user_id,tier_id,starts_on,ends_on,stripe_reference,note,verified_by) VALUES(_user_id,'supporter',_starts_on,_ends_on,_reference,_clean_note,auth.uid()) ON CONFLICT(user_id) DO UPDATE SET starts_on=excluded.starts_on,ends_on=excluded.ends_on,stripe_reference=excluded.stripe_reference,note=excluded.note,verified_by=excluded.verified_by,verified_at=now();
 INSERT INTO public.user_ai_quotas(user_id,tier_id,valid_until,updated_by) VALUES(_user_id,'supporter',_ends_on,auth.uid()) ON CONFLICT(user_id) DO UPDATE SET tier_id='supporter',valid_until=excluded.valid_until,updated_by=excluded.updated_by,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.set_manual_membership(uuid,date,date,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_manual_membership(uuid,date,date,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.set_manual_membership(_user_id uuid, _starts_on date, _ends_on date, _stripe_reference text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.set_manual_membership(_user_id,_starts_on,_ends_on,_stripe_reference,NULL); END $$;
REVOKE ALL ON FUNCTION public.set_manual_membership(uuid,date,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_manual_membership(uuid,date,date,text) TO authenticated;