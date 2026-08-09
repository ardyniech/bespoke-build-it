CREATE OR REPLACE FUNCTION public.is_kejadian_responder(_kejadian_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kejadian_responders r WHERE r.kejadian_id = _kejadian_id AND r.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_kejadian_pelapor(_kejadian_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kejadian k WHERE k.id = _kejadian_id AND k.pelapor_id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.is_kejadian_responder(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_kejadian_pelapor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_kejadian_responder(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kejadian_pelapor(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Kejadian aktif atau terkait" ON public.kejadian;
CREATE POLICY "Kejadian aktif atau terkait" ON public.kejadian
FOR SELECT TO authenticated
USING (
  status <> 'closed'::kejadian_status
  OR auth.uid() = pelapor_id
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_kejadian_responder(id, auth.uid())
);

DROP POLICY IF EXISTS "Responder terkait saja" ON public.kejadian_responders;
CREATE POLICY "Responder terkait saja" ON public.kejadian_responders
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_kejadian_pelapor(kejadian_id, auth.uid())
);