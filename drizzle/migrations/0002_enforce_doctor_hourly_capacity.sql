CREATE OR REPLACE FUNCTION public.enforce_doctor_hourly_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
  v_capacity integer;
  v_count integer;
  v_hour text;
  v_period text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'confirmed'
     AND NEW.doctor_id IS NOT DISTINCT FROM OLD.doctor_id
     AND NEW.doctor_name IS NOT DISTINCT FROM OLD.doctor_name
     AND NEW.date IS NOT DISTINCT FROM OLD.date
     AND NEW.time IS NOT DISTINCT FROM OLD.time THEN
    RETURN NEW;
  END IF;

  IF NEW.doctor_id IS NOT NULL THEN
    SELECT id, patients_per_hour INTO v_doctor_id, v_capacity
    FROM public.doctors WHERE id = NEW.doctor_id FOR UPDATE;
  ELSE
    SELECT id, patients_per_hour INTO v_doctor_id, v_capacity
    FROM public.doctors WHERE name = NEW.doctor_name
    ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;

  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    RETURN NEW;
  END IF;

  v_hour := split_part(trim(NEW.time), ':', 1);
  v_period := split_part(trim(NEW.time), ' ', 2);

  SELECT count(*) INTO v_count
  FROM public.bookings b
  WHERE b.status = 'confirmed'
    AND b.date = NEW.date
    AND b.id <> NEW.id
    AND (b.doctor_id = v_doctor_id OR (b.doctor_id IS NULL AND b.doctor_name = NEW.doctor_name))
    AND split_part(trim(b.time), ':', 1) = v_hour
    AND split_part(trim(b.time), ' ', 2) = v_period;

  IF v_count >= v_capacity THEN
    RAISE EXCEPTION 'DOCTOR_HOUR_FULL' USING ERRCODE = 'P0001',
      HINT = 'اكتملت سعة الطبيب في هذه الساعة';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_doctor_hourly_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_enforce_doctor_hourly_capacity ON public.bookings;
CREATE TRIGGER bookings_enforce_doctor_hourly_capacity
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_doctor_hourly_capacity();

-- Public availability: only per-hour counts, no patient details.
CREATE OR REPLACE FUNCTION public.get_doctor_hour_load(_doctor_name text, _date text)
RETURNS TABLE(hour_key text, booked integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(trim(b.time), ':', 1) || ' ' || split_part(trim(b.time), ' ', 2) AS hour_key,
         count(*)::integer AS booked
  FROM public.bookings b
  WHERE b.status = 'confirmed'
    AND b.date = _date
    AND b.doctor_name = _doctor_name
  GROUP BY 1
$$;

REVOKE ALL ON FUNCTION public.get_doctor_hour_load(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_hour_load(text, text) TO anon, authenticated;