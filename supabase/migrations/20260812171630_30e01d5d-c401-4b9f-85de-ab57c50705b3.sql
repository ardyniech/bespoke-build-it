CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.jenjang IS DISTINCT FROM OLD.jenjang)
     AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Status dan jenjang keanggotaan hanya dapat diubah oleh satgas/admin/super admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_privileged_fields ON public.profiles;
CREATE TRIGGER trg_profiles_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privileged_fields();