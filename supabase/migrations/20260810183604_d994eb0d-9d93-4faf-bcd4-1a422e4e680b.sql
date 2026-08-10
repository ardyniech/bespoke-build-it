
-- ============ 1. Helper functions ============
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'aktif');
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'satgas') OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'super_admin');
$$;

-- Tier approval kas: role minimum berdasarkan besaran transaksi
CREATE OR REPLACE FUNCTION public.kas_min_role(_jumlah numeric)
RETURNS public.app_role LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _jumlah >= 5000000 THEN 'super_admin'::public.app_role
    WHEN _jumlah >= 2000000 THEN 'admin'::public.app_role
    ELSE 'bendahara'::public.app_role
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_approve_kas(_user_id uuid, _jumlah numeric)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _jumlah >= 5000000 THEN public.has_role(_user_id, 'super_admin')
    WHEN _jumlah >= 2000000 THEN public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'super_admin')
    ELSE public.has_role(_user_id, 'bendahara') OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'super_admin')
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kas_min_role(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_approve_kas(uuid, numeric) FROM anon;

-- ============ 2. Akun baru => pending_review ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@','1'::int)),
    'pending_review'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'anggota');
  RETURN NEW;
END; $$;

-- ============ 3. live_locations RLS ============
DROP POLICY IF EXISTS "Lihat lokasi on-bit aktif atau milik sendiri" ON public.live_locations;
CREATE POLICY "Lokasi live: pemilik, pengurus, atau anggota aktif"
ON public.live_locations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.is_active_member(user_id)
    AND on_bit = true
    AND last_seen > (now() - interval '1 hour')
  )
);

-- ============ 4. Direktori anggota hanya untuk anggota aktif/pengurus ============
DROP POLICY IF EXISTS "Direktori anggota (kolom aman)" ON public.profiles;
CREATE POLICY "Direktori anggota untuk anggota aktif"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_staff(auth.uid()) OR public.is_active_member(auth.uid()));

-- ============ 5. Kejadian aktif hanya untuk anggota aktif/pengurus ============
DROP POLICY IF EXISTS "Kejadian aktif atau terkait" ON public.kejadian;
CREATE POLICY "Kejadian aktif atau terkait"
ON public.kejadian FOR SELECT TO authenticated
USING (
  auth.uid() = pelapor_id
  OR public.is_staff(auth.uid())
  OR public.is_kejadian_responder(id, auth.uid())
  OR (status <> 'closed' AND public.is_active_member(auth.uid()))
);

-- ============ 6. Kas: default status 4 tier ============
CREATE OR REPLACE FUNCTION public.set_kas_default_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.jumlah < 500000 THEN
      NEW.status := 'disetujui';
      NEW.approved_by := NEW.created_by;
      NEW.approved_at := now();
    ELSE
      NEW.status := 'menunggu';
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Enforce tier saat approve/tolak
CREATE OR REPLACE FUNCTION public.enforce_kas_approval_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.can_approve_kas(auth.uid(), OLD.jumlah) THEN
      RAISE EXCEPTION 'Butuh role % untuk menyetujui/menolak transaksi sebesar %',
        public.kas_min_role(OLD.jumlah), OLD.jumlah;
    END IF;
  END IF;
  IF NEW.jumlah IS DISTINCT FROM OLD.jumlah
     AND OLD.status = 'disetujui'
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Jumlah transaksi yang sudah disetujui hanya bisa diubah super admin';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_kas_approval_tier ON public.kas_transactions;
CREATE TRIGGER trg_kas_approval_tier
BEFORE UPDATE ON public.kas_transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_kas_approval_tier();

-- ============ 7. Audit log kas ============
CREATE TABLE IF NOT EXISTS public.kas_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid,
  action text NOT NULL,
  actor_id uuid,
  jumlah numeric,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kas_audit_log TO authenticated;
GRANT ALL ON public.kas_audit_log TO service_role;
ALTER TABLE public.kas_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bendahara/admin lihat audit kas" ON public.kas_audit_log;
CREATE POLICY "Bendahara/admin lihat audit kas"
ON public.kas_audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'bendahara')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE OR REPLACE FUNCTION public.log_kas_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.kas_audit_log(transaction_id, action, actor_id, jumlah, old_data, new_data)
    VALUES (OLD.id, 'delete', auth.uid(), OLD.jumlah, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.jumlah IS DISTINCT FROM OLD.jumlah
       OR NEW.ledger IS DISTINCT FROM OLD.ledger
       OR NEW.jenis IS DISTINCT FROM OLD.jenis THEN
      INSERT INTO public.kas_audit_log(transaction_id, action, actor_id, jumlah, old_data, new_data)
      VALUES (NEW.id, 'update', auth.uid(), NEW.jumlah, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_kas_audit ON public.kas_transactions;
CREATE TRIGGER trg_kas_audit
AFTER UPDATE OR DELETE ON public.kas_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_kas_change();

-- ============ 8. Saldo agregat ============
CREATE OR REPLACE FUNCTION public.kas_balances()
RETURNS TABLE(ledger public.kas_ledger, masuk numeric, keluar numeric, saldo numeric, menunggu bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.ledger,
    COALESCE(SUM(t.jumlah) FILTER (WHERE t.status = 'disetujui' AND t.jenis = 'masuk'), 0)::numeric,
    COALESCE(SUM(t.jumlah) FILTER (WHERE t.status = 'disetujui' AND t.jenis = 'keluar'), 0)::numeric,
    COALESCE(SUM(CASE WHEN t.status = 'disetujui' AND t.jenis = 'masuk' THEN t.jumlah
                      WHEN t.status = 'disetujui' AND t.jenis = 'keluar' THEN -t.jumlah
                      ELSE 0 END), 0)::numeric,
    COUNT(*) FILTER (WHERE t.status = 'menunggu')
  FROM public.kas_transactions t
  WHERE public.is_active_member(auth.uid()) OR public.is_staff(auth.uid())
     OR public.has_role(auth.uid(), 'bendahara')
  GROUP BY t.ledger;
$$;

REVOKE EXECUTE ON FUNCTION public.kas_balances() FROM anon;
GRANT EXECUTE ON FUNCTION public.kas_balances() TO authenticated;
