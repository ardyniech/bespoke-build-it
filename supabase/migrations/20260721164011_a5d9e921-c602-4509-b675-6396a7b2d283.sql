
-- Kas approval tiering
CREATE TYPE public.kas_status AS ENUM ('menunggu','disetujui','ditolak');

ALTER TABLE public.kas_transactions
  ADD COLUMN status public.kas_status NOT NULL DEFAULT 'disetujui',
  ADD COLUMN approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN catatan_approver text;

-- Trigger: assign status berdasarkan tier jumlah pada insert
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

DROP TRIGGER IF EXISTS trg_kas_default_status ON public.kas_transactions;
CREATE TRIGGER trg_kas_default_status
BEFORE INSERT ON public.kas_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_kas_default_status();

-- Piket swap requests
CREATE TABLE public.piket_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.piket_shifts(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  alasan text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piket_swap_requests TO authenticated;
GRANT ALL ON public.piket_swap_requests TO service_role;

ALTER TABLE public.piket_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swap select terlibat atau admin"
ON public.piket_swap_requests FOR SELECT TO authenticated
USING (
  auth.uid() = requested_by
  OR auth.uid() = target_user_id
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'super_admin')
);

CREATE POLICY "swap insert requester"
ON public.piket_swap_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "swap update target/requester/admin"
ON public.piket_swap_requests FOR UPDATE TO authenticated
USING (
  auth.uid() = target_user_id
  OR auth.uid() = requested_by
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'super_admin')
);

CREATE TRIGGER trg_swap_updated_at
BEFORE UPDATE ON public.piket_swap_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.piket_swap_requests;
ALTER TABLE public.piket_swap_requests REPLICA IDENTITY FULL;
