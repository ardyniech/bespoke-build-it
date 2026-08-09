DROP VIEW IF EXISTS public.member_directory;

DROP POLICY IF EXISTS "Profil sendiri atau satgas/admin" ON public.profiles;
CREATE POLICY "Direktori anggota (kolom aman)"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Column-level privileges hide contact PII from the Data API entirely
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, nama, foto_url, jenjang, status, bio, created_at, updated_at,
  notif_sos, notif_kas, notif_pengumuman, notif_email)
ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.member_contacts()
RETURNS TABLE(id uuid, no_hp text, alamat text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.no_hp, p.alamat, p.email
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'satgas')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    );
$$;

REVOKE ALL ON FUNCTION public.member_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_contacts() TO authenticated;