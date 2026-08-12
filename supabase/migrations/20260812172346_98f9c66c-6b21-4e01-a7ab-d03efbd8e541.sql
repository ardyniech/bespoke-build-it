CREATE OR REPLACE FUNCTION public.submit_screening_application(_nama text, _no_hp text, _email text, _alamat text DEFAULT NULL::text, _kota text DEFAULT NULL::text, _motivasi text DEFAULT NULL::text, _answers jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  new_token uuid;
  item jsonb;
  norm_email text;
  last_at timestamptz;
  daily_count int;
BEGIN
  IF _nama IS NULL OR length(trim(_nama)) < 3 OR length(trim(_nama)) > 120 THEN
    RAISE EXCEPTION 'Nama tidak valid';
  END IF;
  IF _no_hp IS NULL OR length(trim(_no_hp)) < 7 OR length(trim(_no_hp)) > 30 THEN
    RAISE EXCEPTION 'Nomor HP tidak valid';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email tidak valid';
  END IF;

  norm_email := lower(trim(_email));

  IF EXISTS (
    SELECT 1 FROM public.screening_applications
    WHERE lower(email) = norm_email
      AND status IN ('menunggu', 'wawancara')
  ) THEN
    RAISE EXCEPTION 'Kamu sudah punya pendaftaran yang sedang diproses. Silakan tunggu keputusan PIC sebelum mendaftar lagi.';
  END IF;

  SELECT max(created_at) INTO last_at
  FROM public.screening_applications
  WHERE lower(email) = norm_email;

  IF last_at IS NOT NULL AND last_at > now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'Pendaftaran dengan email ini baru saja dikirim. Coba lagi setelah 10 menit.';
  END IF;

  SELECT count(*) INTO daily_count
  FROM public.screening_applications
  WHERE lower(email) = norm_email
    AND created_at > now() - interval '24 hours';

  IF daily_count >= 3 THEN
    RAISE EXCEPTION 'Batas pendaftaran tercapai: maksimal 3 kali per email dalam 24 jam. Coba lagi besok.';
  END IF;

  INSERT INTO public.screening_applications (nama, no_hp, email, alamat, kota, motivasi)
  VALUES (
    trim(_nama),
    trim(_no_hp),
    norm_email,
    NULLIF(trim(COALESCE(_alamat, '')), ''),
    NULLIF(trim(COALESCE(_kota, '')), ''),
    NULLIF(trim(COALESCE(_motivasi, '')), '')
  )
  RETURNING id, verify_token INTO new_id, new_token;

  IF _answers IS NOT NULL AND jsonb_typeof(_answers) = 'array' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(_answers)
    LOOP
      IF (item->>'question_id') IS NOT NULL THEN
        INSERT INTO public.screening_answers (application_id, question_id, jawaban)
        VALUES (new_id, (item->>'question_id')::uuid, left(COALESCE(item->>'jawaban', ''), 2000));
      END IF;
    END LOOP;
  END IF;

  RETURN new_token;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_screening_application(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_screening_application(text, text, text, text, text, text, jsonb) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_screening_apps_email_lower_created
  ON public.screening_applications (lower(email), created_at DESC);