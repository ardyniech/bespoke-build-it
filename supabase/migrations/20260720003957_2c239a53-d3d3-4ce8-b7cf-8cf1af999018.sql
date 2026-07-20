
DROP FUNCTION IF EXISTS public.get_application_status(uuid);

ALTER TABLE public.screening_applications
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS screening_applications_verify_token_key
  ON public.screening_applications(verify_token);

CREATE TABLE IF NOT EXISTS public.screening_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.screening_applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  old_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.screening_audit_log TO authenticated;
GRANT ALL ON public.screening_audit_log TO service_role;

ALTER TABLE public.screening_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.screening_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.screening_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.log_screening_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.screening_audit_log(application_id, actor_id, old_status, new_status, note)
    VALUES (NEW.id, auth.uid(), OLD.status::text, NEW.status::text, NEW.catatan_pic);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_screening_status_audit ON public.screening_applications;
CREATE TRIGGER trg_screening_status_audit
  AFTER UPDATE ON public.screening_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_screening_status_change();

CREATE OR REPLACE FUNCTION public.verify_application_email(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated int;
BEGIN
  UPDATE public.screening_applications
  SET email_verified = true, verified_at = now()
  WHERE verify_token = _token AND email_verified = false;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_application_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_application_email(uuid) TO anon, authenticated;

CREATE FUNCTION public.get_application_status(_token uuid)
RETURNS TABLE(
  id uuid, nama text, status text, email_verified boolean,
  created_at timestamptz, reviewed_at timestamptz, catatan_pic text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nama, status::text, email_verified, created_at, reviewed_at, catatan_pic
  FROM public.screening_applications
  WHERE verify_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_application_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_application_status(uuid) TO anon, authenticated;
