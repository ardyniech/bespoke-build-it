
CREATE OR REPLACE FUNCTION public.compute_screening_answer_weight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  bobot numeric := 0;
BEGIN
  SELECT * INTO q FROM public.screening_questions WHERE id = NEW.question_id;
  IF q IS NULL THEN RETURN NEW; END IF;

  IF q.opsi IS NOT NULL AND NEW.jawaban IS NOT NULL THEN
    SELECT COALESCE((elem->>'bobot')::numeric, 0) INTO bobot
    FROM jsonb_array_elements(q.opsi) elem
    WHERE elem->>'label' = NEW.jawaban
    LIMIT 1;
  ELSIF q.tipe = 'text' AND NEW.jawaban IS NOT NULL AND length(trim(NEW.jawaban)) > 10 THEN
    bobot := q.bobot_max;
  END IF;

  NEW.bobot_didapat := COALESCE(bobot, 0);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.compute_screening_answer_weight() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_answer_weight ON public.screening_answers;
CREATE TRIGGER trg_answer_weight
  BEFORE INSERT ON public.screening_answers
  FOR EACH ROW EXECUTE FUNCTION public.compute_screening_answer_weight();

CREATE OR REPLACE FUNCTION public.recalc_application_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.screening_applications
  SET skor_total = COALESCE((
    SELECT SUM(bobot_didapat) FROM public.screening_answers
    WHERE application_id = NEW.application_id
  ), 0)
  WHERE id = NEW.application_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.recalc_application_score() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_recalc_score ON public.screening_answers;
CREATE TRIGGER trg_recalc_score
  AFTER INSERT ON public.screening_answers
  FOR EACH ROW EXECUTE FUNCTION public.recalc_application_score();
