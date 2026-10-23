CREATE OR REPLACE FUNCTION public.enforce_doctor_hourly_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
  v_capacity integer;
  v_daily integer;
  v_count integer;
  v_day_count integer;
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
    SELECT id, patients_per_hour, max_patients INTO v_doctor_id, v_capacity, v_daily
    FROM public.doctors WHERE id = NEW.doctor_id FOR UPDATE;
  ELSE
    SELECT id, patients_per_hour, max_patients INTO v_doctor_id, v_capacity, v_daily
    FROM public.doctors WHERE name = NEW.doctor_name
    ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;

  IF v_doctor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Daily limit (max patients per day)
  IF v_daily IS NOT NULL AND v_daily > 0 THEN
    SELECT count(*) INTO v_day_count
    FROM public.bookings b
    WHERE b.status = 'confirmed'
      AND b.date = NEW.date
      AND b.id <> NEW.id
      AND (b.doctor_id = v_doctor_id OR (b.doctor_id IS NULL AND b.doctor_name = NEW.doctor_name));
    IF v_day_count >= v_daily THEN
      RAISE EXCEPTION 'DOCTOR_DAY_FULL' USING ERRCODE = 'P0001',
        HINT = 'اكتمل الحد الأقصى لعدد المرضى لهذا الطبيب في هذا اليوم';
    END IF;
  END IF;

  -- Hourly limit (patients per hour)
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