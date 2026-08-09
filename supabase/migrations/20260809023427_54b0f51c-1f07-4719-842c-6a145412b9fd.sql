-- 1. PROFILES: restrict PII, expose safe directory view
DROP POLICY IF EXISTS "Anggota bisa lihat semua profil" ON public.profiles;
CREATE POLICY "Profil sendiri atau satgas/admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE OR REPLACE VIEW public.member_directory
WITH (security_invoker = false) AS
  SELECT id, nama, foto_url, jenjang, status, bio FROM public.profiles;
REVOKE ALL ON public.member_directory FROM anon;
GRANT SELECT ON public.member_directory TO authenticated;
GRANT ALL ON public.member_directory TO service_role;

-- 2. LIVE LOCATIONS
DROP POLICY IF EXISTS "Authenticated can view all live locations" ON public.live_locations;
CREATE POLICY "Lihat lokasi on-bit aktif atau milik sendiri"
ON public.live_locations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (on_bit = true AND last_seen > now() - interval '1 hour')
);

-- 3. KAS
DROP POLICY IF EXISTS "Anggota lihat kas" ON public.kas_transactions;
CREATE POLICY "Bendahara/admin atau pembuat lihat kas"
ON public.kas_transactions FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'bendahara')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 4. KEJADIAN
DROP POLICY IF EXISTS "Anggota lihat kejadian" ON public.kejadian;
CREATE POLICY "Kejadian aktif atau terkait"
ON public.kejadian FOR SELECT TO authenticated
USING (
  status <> 'closed'
  OR auth.uid() = pelapor_id
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.kejadian_responders r
    WHERE r.kejadian_id = kejadian.id AND r.user_id = auth.uid()
  )
);

-- 5. KEJADIAN RESPONDERS
DROP POLICY IF EXISTS "Anggota lihat responder" ON public.kejadian_responders;
CREATE POLICY "Responder terkait saja"
ON public.kejadian_responders FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.kejadian k
    WHERE k.id = kejadian_responders.kejadian_id AND k.pelapor_id = auth.uid()
  )
);

-- 6. PIKET SHIFTS
DROP POLICY IF EXISTS "all auth read piket" ON public.piket_shifts;
CREATE POLICY "Piket sendiri atau satgas/admin"
ON public.piket_shifts FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = created_by
  OR public.has_role(auth.uid(), 'satgas')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 7. SCREENING PII: hide verify_token from app roles
REVOKE SELECT ON public.screening_applications FROM authenticated;
GRANT SELECT (id, nama, no_hp, email, alamat, kota, motivasi, status, skor_total,
  catatan_pic, reviewed_by, reviewed_at, created_at, updated_at, email_verified, verified_at)
ON public.screening_applications TO authenticated;

-- 8. Replace always-true INSERT policies with validated ones
DROP POLICY IF EXISTS "anon submit application" ON public.screening_applications;
DROP POLICY IF EXISTS "auth submit application" ON public.screening_applications;
CREATE POLICY "submit application validated"
ON public.screening_applications FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(nama)) BETWEEN 2 AND 120
  AND length(btrim(no_hp)) BETWEEN 6 AND 25
  AND (email IS NULL OR (length(email) <= 254 AND position('@' in email) > 1))
  AND (alamat IS NULL OR length(alamat) <= 500)
  AND (kota IS NULL OR length(kota) <= 100)
  AND (motivasi IS NULL OR length(motivasi) <= 3000)
  AND status = 'menunggu'
  AND email_verified = false
  AND skor_total IS NULL
  AND reviewed_by IS NULL
  AND catatan_pic IS NULL
);

DROP POLICY IF EXISTS "anon insert answer" ON public.screening_answers;
DROP POLICY IF EXISTS "auth insert answer" ON public.screening_answers;
CREATE POLICY "insert answer validated"
ON public.screening_answers FOR INSERT TO anon, authenticated
WITH CHECK (
  (jawaban IS NULL OR length(jawaban) <= 3000)
  AND EXISTS (
    SELECT 1 FROM public.screening_applications a
    WHERE a.id = application_id AND a.status = 'menunggu'
  )
  AND EXISTS (
    SELECT 1 FROM public.screening_questions q
    WHERE q.id = question_id AND q.aktif = true
  )
);

-- 9. Lock down SECURITY DEFINER helper/trigger functions from direct API calls
REVOKE ALL ON FUNCTION public.compute_screening_answer_weight() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.log_screening_status_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_application_score() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_kas_default_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.get_application_status(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.verify_application_email(uuid) FROM authenticated;