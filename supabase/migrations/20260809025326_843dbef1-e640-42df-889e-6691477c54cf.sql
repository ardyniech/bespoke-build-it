CREATE OR REPLACE FUNCTION public.submit_screening_application(
  _nama text,
  _no_hp text,
  _email text,
  _alamat text DEFAULT NULL,
  _kota text DEFAULT NULL,
  _motivasi text DEFAULT NULL,
  _answers jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_token uuid;
  item jsonb;
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

  INSERT INTO public.screening_applications (nama, no_hp, email, alamat, kota, motivasi)
  VALUES (
    trim(_nama),
    trim(_no_hp),
    lower(trim(_email)),
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
$$;

REVOKE ALL ON FUNCTION public.submit_screening_application(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_screening_application(text, text, text, text, text, text, jsonb) TO anon, authenticated;