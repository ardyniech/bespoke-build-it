
-- 1. Email verification fields
ALTER TABLE public.screening_applications
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_screening_apps_verify_token ON public.screening_applications(verify_token);

-- 2. Audit log
CREATE TABLE IF NOT EXISTS public.screening_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.screening_applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_nama text,
  from_status public.screening_status,
  to_status public.screening_status NOT NULL,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.screening_audit_log TO authenticated;
GRANT ALL ON public.screening_audit_log TO service_role;

ALTER TABLE public.screening_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kader read audit"
  ON public.screening_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "kader insert audit"
  ON public.screening_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_screening_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nm text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT nama INTO nm FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.screening_audit_log(application_id, actor_id, actor_nama, from_status, to_status, catatan)
    VALUES (NEW.id, auth.uid(), nm, OLD.status, NEW.status, NEW.catatan_pic);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_screening_status_audit ON public.screening_applications;
CREATE TRIGGER trg_screening_status_audit
  AFTER UPDATE ON public.screening_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_screening_status_change();

-- 4. Public status lookup by token (applicant-facing)
CREATE OR REPLACE FUNCTION public.get_application_status(_token uuid)
RETURNS TABLE(
  id uuid, nama text, status public.screening_status,
  email_verified boolean, created_at timestamptz,
  reviewed_at timestamptz, catatan_pic text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nama, status, email_verified, created_at, reviewed_at, catatan_pic
  FROM public.screening_applications
  WHERE verify_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_status(uuid) TO anon, authenticated;

-- 5. Public email verification via token
CREATE OR REPLACE FUNCTION public.verify_application_email(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  UPDATE public.screening_applications
    SET email_verified = true, verified_at = now()
    WHERE verify_token = _token AND email_verified = false
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_application_email(uuid) TO anon, authenticated;

-- 6. Return verify_token to the anonymous submitter so the client can redirect to /status/:token
-- The INSERT already returns whatever the client requests; token now exists as a column.
