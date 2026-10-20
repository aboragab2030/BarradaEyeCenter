-- Ported from the original project's supabase/migrations and drizzle/migrations (in order)

CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE public.payment_type AS ENUM ('wallet', 'instapay', 'fawry', 'other');

CREATE TABLE public.app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'مركز براده للعيون',
  hero_title TEXT,
  hero_description TEXT,
  logo_url TEXT,
  phones TEXT[],
  addresses TEXT[],
  facebook_url TEXT,
  whatsapp_number TEXT,
  map_location_url TEXT,
  language TEXT DEFAULT 'ar',
  patient_mode BOOLEAN DEFAULT false,
  payment_methods JSONB,
  reminder_settings JSONB,
  stats JSONB,
  terms_ar TEXT,
  terms_en TEXT,
  working_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  image TEXT,
  max_patients INTEGER NOT NULL DEFAULT 10,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  fee INTEGER NOT NULL DEFAULT 150,
  rating NUMERIC,
  top_specialties TEXT[],
  available_dates TEXT[],
  patients_per_hour INTEGER,
  experience INTEGER,
  education TEXT,
  follow_up_exam_count INTEGER,
  follow_up_surgery_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone2 TEXT,
  patient_email TEXT,
  address TEXT,
  doctor_id UUID REFERENCES public.doctors(id),
  doctor_name TEXT NOT NULL,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  reminder_sent BOOLEAN DEFAULT false,
  reminder_type TEXT,
  contracting_company_id INTEGER,
  contracting_docs JSONB,
  payment_method TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contracting_companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  documents TEXT[] DEFAULT '{}',
  manager_name TEXT,
  manager_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hero_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_phone2 TEXT,
  patient_email TEXT,
  doctor_name TEXT NOT NULL,
  surgery_type TEXT NOT NULL,
  date TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT false,
  contracting_company_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  amount INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'wallet',
  payment_type_detail TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  booking_id TEXT,
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id),
  patient_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT,
  login_username TEXT,
  permissions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  color TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id uuid NOT NULL,
  staff_name text NOT NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  contact_type text NOT NULL,
  item_type text NOT NULL,
  item_id text,
  doctor_name text,
  message_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS governorate text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS center text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'cash';

ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

CREATE VIEW public.app_settings_public
WITH (security_invoker = true)
AS
SELECT id, app_name, hero_title, hero_description, logo_url, language, patient_mode, stats, terms_ar, terms_en, working_hours, created_at
FROM public.app_settings;

-- Data API grants (match the RLS policies below)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.doctors, public.services, public.hero_images, public.partners, public.app_settings_public TO anon;
GRANT INSERT ON public.bookings, public.complaints TO anon;

-- Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bookings_by_phone(phone_number text)
 RETURNS TABLE(booking_id uuid, doctor_name text, service text, booking_date text, booking_time text, booking_status text, created_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: staff or admin role required';
  END IF;
  RETURN QUERY
  SELECT b.id, b.doctor_name, b.service, b.date, b.time, b.status, b.created_at
  FROM public.bookings b
  WHERE b.phone = phone_number OR b.phone2 = phone_number
  ORDER BY b.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_by_login_username(p_login_username text)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.user_id, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.login_username = p_login_username AND p.is_active = true;
END;
$function$;

-- RLS
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracting_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public read hero_images" ON public.hero_images FOR SELECT USING (true);
CREATE POLICY "Public read partners" ON public.partners FOR SELECT USING (true);

CREATE POLICY "Anyone can insert bookings" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Staff can read all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update bookings" ON public.bookings FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admin can delete bookings" ON public.bookings FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert complaints" ON public.complaints FOR INSERT TO anon, authenticated WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Staff can read complaints" ON public.complaints FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can read operations" ON public.operations FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert operations" ON public.operations FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update operations" ON public.operations FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admin can delete operations" ON public.operations FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access payments" ON public.payments FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff full access payment_notifications" ON public.payment_notifications FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff full access app_notifications" ON public.app_notifications FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff full access profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff full access user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff manage doctors" ON public.doctors FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage services" ON public.services FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage hero_images" ON public.hero_images FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage partners" ON public.partners FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage contracting_companies" ON public.contracting_companies FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage app_settings" ON public.app_settings FOR ALL USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can read contact_logs" ON public.contact_logs FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert contact_logs" ON public.contact_logs FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Admin can delete contact_logs" ON public.contact_logs FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracting_companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;

-- InstaPay manual verification (drizzle 0000)
CREATE TABLE public.instapay_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  booking_ref text NOT NULL UNIQUE,
  transaction_ref text NOT NULL,
  declared_amount integer,
  amount_due integer NOT NULL,
  verified_amount integer,
  evidence_path text,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','REVIEW_REQUIRED','PAID','MISMATCH','REJECTED')),
  reason text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  payment_id uuid REFERENCES public.payments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX instapay_paid_txn_unique ON public.instapay_submissions (lower(trim(transaction_ref))) WHERE status = 'PAID';
CREATE INDEX instapay_txn_idx ON public.instapay_submissions (lower(trim(transaction_ref)));

CREATE TABLE public.instapay_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.instapay_submissions(id) ON DELETE RESTRICT,
  booking_ref text NOT NULL,
  event_type text NOT NULL,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'SYSTEM',
  previous_status text,
  new_status text,
  reason text,
  verification_method text NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.instapay_submissions TO authenticated;
GRANT ALL ON public.instapay_submissions TO service_role;
GRANT SELECT ON public.instapay_audit_events TO authenticated;
GRANT ALL ON public.instapay_audit_events TO service_role;

ALTER TABLE public.instapay_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instapay_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_review_instapay(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _uid AND p.is_active IS NOT FALSE
      AND public.is_staff_or_admin(_uid)
      AND COALESCE(p.permissions, '[]'::jsonb) ? 'review_instapay'
  )
$$;

CREATE POLICY "Reviewers read submissions" ON public.instapay_submissions FOR SELECT TO authenticated USING (public.can_review_instapay(auth.uid()));
CREATE POLICY "Reviewers read audit" ON public.instapay_audit_events FOR SELECT TO authenticated USING (public.can_review_instapay(auth.uid()));

CREATE OR REPLACE FUNCTION public.instapay_amount_due(_service text, _doctor_id uuid, _doctor_name text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT price FROM public.services WHERE title = _service LIMIT 1), 0)
       + CASE WHEN _service LIKE '%متابعة كشف%' OR _service LIKE '%متابعة الكشف%' OR _service LIKE '%متابعة عملية%' OR _service LIKE '%متابعة العملية%' THEN 0
              ELSE COALESCE((SELECT fee FROM public.doctors WHERE id = _doctor_id OR (_doctor_id IS NULL AND name = _doctor_name) LIMIT 1), 0) END
$$;

CREATE OR REPLACE FUNCTION public.submit_instapay_payment(_booking_id uuid, _phone text, _transaction_ref text, _declared_amount integer, _evidence_path text)
RETURNS TABLE(booking_ref text, amount_due integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; v_ref text; v_due integer; v_id uuid; v_txn text := trim(COALESCE(_transaction_ref, ''));
BEGIN
  IF length(v_txn) < 4 OR length(v_txn) > 100 THEN RAISE EXCEPTION 'invalid transaction reference'; END IF;
  IF _declared_amount IS NOT NULL AND (_declared_amount < 0 OR _declared_amount > 1000000) THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _evidence_path IS NOT NULL AND _evidence_path NOT LIKE _booking_id::text || '/%' THEN RAISE EXCEPTION 'invalid evidence path'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND OR b.phone <> _phone OR COALESCE(b.payment_method,'') <> 'instapay' THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF b.created_at < now() - interval '1 hour' THEN RAISE EXCEPTION 'submission window closed'; END IF;
  IF EXISTS (SELECT 1 FROM public.instapay_submissions s WHERE s.booking_id = _booking_id) THEN RAISE EXCEPTION 'already submitted'; END IF;
  v_due := public.instapay_amount_due(b.service, b.doctor_id, b.doctor_name);
  v_ref := 'BR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.instapay_submissions (booking_id, booking_ref, transaction_ref, declared_amount, amount_due, evidence_path)
  VALUES (_booking_id, v_ref, v_txn, _declared_amount, v_due, _evidence_path) RETURNING id INTO v_id;
  INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, previous_status, new_status)
  VALUES (v_id, v_ref, 'PAYMENT_EVIDENCE_SUBMITTED', 'NOT_STARTED', 'PENDING_REVIEW');
  INSERT INTO public.payment_notifications (patient_name, amount, message)
  VALUES (b.patient_name, COALESCE(_declared_amount, v_due), 'طلب مراجعة تحويل إنستاباي للحجز ' || v_ref || ' - رقم العملية: ' || v_txn);
  RETURN QUERY SELECT v_ref, v_due, 'PENDING_REVIEW'::text;
END $$;

CREATE OR REPLACE FUNCTION public.get_instapay_status(_booking_ref text, _phone text)
RETURNS TABLE(booking_ref text, status text, reason text, amount_due integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.booking_ref, s.status, CASE WHEN s.status IN ('REJECTED','MISMATCH') THEN s.reason END, s.amount_due
  FROM public.instapay_submissions s JOIN public.bookings b ON b.id = s.booking_id
  WHERE s.booking_ref = upper(trim(_booking_ref)) AND (b.phone = trim(_phone) OR b.phone2 = trim(_phone))
$$;

CREATE OR REPLACE FUNCTION public.review_instapay_payment(_submission_id uuid, _action text, _verified_amount integer, _reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.instapay_submissions; b public.bookings; v_new text; v_name text; v_pay uuid; v_event text;
BEGIN
  IF NOT public.can_review_instapay(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM public.instapay_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF s.status IN ('PAID','REJECTED') THEN RAISE EXCEPTION 'already finalized'; END IF;
  SELECT COALESCE((SELECT name FROM public.profiles WHERE user_id = auth.uid()), 'staff') INTO v_name;
  IF _action = 'approve' THEN
    IF _verified_amount IS NULL THEN RAISE EXCEPTION 'verified amount required'; END IF;
    IF _verified_amount <> s.amount_due THEN
      v_new := 'MISMATCH'; v_event := 'PAYMENT_FLAGGED';
      _reason := COALESCE(NULLIF(trim(_reason),''), 'المبلغ المستلم ' || _verified_amount || ' لا يطابق المستحق ' || s.amount_due);
    ELSE
      IF EXISTS (SELECT 1 FROM public.instapay_submissions x WHERE x.id <> s.id AND x.status = 'PAID' AND lower(trim(x.transaction_ref)) = lower(trim(s.transaction_ref))) THEN
        RAISE EXCEPTION 'transaction already allocated';
      END IF;
      IF EXISTS (SELECT 1 FROM public.payments p WHERE lower(trim(p.transaction_id)) = lower(trim(s.transaction_ref))) THEN
        RAISE EXCEPTION 'transaction already recorded';
      END IF;
      SELECT * INTO b FROM public.bookings WHERE id = s.booking_id FOR UPDATE;
      INSERT INTO public.payments (patient_name, patient_phone, amount, transaction_id, payment_type, status, booking_id, matched_at, notes)
      VALUES (b.patient_name, b.phone, _verified_amount, trim(s.transaction_ref), 'instapay', 'paid', s.booking_id::text, now(), 'اعتماد يدوي ' || s.booking_ref)
      RETURNING id INTO v_pay;
      UPDATE public.bookings SET payment_status = 'paid', updated_at = now() WHERE id = s.booking_id;
      v_new := 'PAID'; v_event := 'PAYMENT_APPROVED';
    END IF;
  ELSIF _action = 'reject' THEN
    IF NULLIF(trim(COALESCE(_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'reason required'; END IF;
    v_new := 'REJECTED'; v_event := 'PAYMENT_REJECTED';
  ELSIF _action = 'investigate' THEN
    v_new := 'REVIEW_REQUIRED'; v_event := 'PAYMENT_FLAGGED';
  ELSE RAISE EXCEPTION 'invalid action'; END IF;

  UPDATE public.instapay_submissions SET status = v_new, verified_amount = COALESCE(_verified_amount, verified_amount), reason = NULLIF(trim(COALESCE(_reason,'')),''),
    reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now(), payment_id = COALESCE(v_pay, payment_id), updated_at = now()
  WHERE id = s.id;
  INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, actor_id, actor_name, previous_status, new_status, reason)
  VALUES (s.id, s.booking_ref, v_event, auth.uid(), v_name, s.status, v_new, NULLIF(trim(COALESCE(_reason,'')),''));
  IF v_new = 'PAID' THEN
    INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, actor_id, actor_name, previous_status, new_status)
    VALUES (s.id, s.booking_ref, 'BOOKING_PAYMENT_CONFIRMED', auth.uid(), v_name, s.status, v_new);
  END IF;
  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.submit_instapay_payment(uuid,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_instapay_payment(uuid,text,text,integer,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_instapay_status(text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.review_instapay_payment(uuid,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_instapay_payment(uuid,text,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.instapay_amount_due(text,uuid,text) FROM PUBLIC, anon;

-- InstaPay evidence storage policies (drizzle 0001); bucket created separately
CREATE POLICY "Anyone uploads instapay evidence" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'instapay-evidence' AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','pdf'));
CREATE POLICY "Reviewers read instapay evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'instapay-evidence' AND public.can_review_instapay(auth.uid()));

-- Paymob gateway (drizzle 0002)
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  test_public_key text,
  test_card_integration_id integer,
  test_wallet_integration_id integer,
  live_public_key text,
  live_card_integration_id integer,
  live_wallet_integration_id integer,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_gateway_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payment_gateway_secrets (
  mode text PRIMARY KEY CHECK (mode IN ('test','live')),
  secret_key_enc text,
  hmac_secret_enc text,
  secret_key_last4 text,
  hmac_last4 text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.paymob_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  reference text NOT NULL UNIQUE,
  intention_id text,
  paymob_order_id bigint,
  transaction_id bigint UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EGP',
  mode text NOT NULL CHECK (mode IN ('test','live')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','amount_mismatch')),
  source_type text,
  payment_id uuid REFERENCES public.payments(id),
  raw_callback jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paymob_payments_booking_idx ON public.paymob_payments (booking_id);
CREATE INDEX IF NOT EXISTS paymob_payments_order_idx ON public.paymob_payments (paymob_order_id);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paymob_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_gateway_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_gateway_secrets TO service_role;

REVOKE ALL ON public.payment_gateway_settings FROM PUBLIC, anon;
GRANT SELECT ON public.payment_gateway_settings TO authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;
CREATE POLICY "Admins read gateway settings" ON public.payment_gateway_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.paymob_payments FROM PUBLIC, anon;
GRANT SELECT ON public.paymob_payments TO authenticated;
GRANT ALL ON public.paymob_payments TO service_role;
CREATE POLICY "Reviewers read paymob payments" ON public.paymob_payments FOR SELECT TO authenticated
  USING (public.can_review_instapay(auth.uid()));

CREATE OR REPLACE FUNCTION public.paymob_is_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT enabled FROM public.payment_gateway_settings WHERE id = 1), false)
$$;
GRANT EXECUTE ON FUNCTION public.paymob_is_enabled() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_paymob_status(_reference text)
RETURNS TABLE(reference text, status text, amount integer, booking_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.reference, p.status, (p.amount_cents / 100)::integer, p.booking_id
  FROM public.paymob_payments p WHERE p.reference = upper(trim(_reference))
$$;
GRANT EXECUTE ON FUNCTION public.get_paymob_status(text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.instapay_amount_due(text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.paymob_apply_transaction(
  _reference text, _paymob_order_id bigint, _transaction_id bigint, _amount_cents integer,
  _success boolean, _pending boolean, _source_type text, _raw jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.paymob_payments; b public.bookings; v_status text; v_pay uuid; v_ptype public.payment_type;
BEGIN
  SELECT * INTO p FROM public.paymob_payments
   WHERE (_reference IS NOT NULL AND reference = _reference)
      OR (_reference IS NULL AND paymob_order_id = _paymob_order_id)
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF p.status = 'paid' THEN RETURN 'already_paid'; END IF;
  IF p.transaction_id IS NOT NULL AND p.transaction_id = _transaction_id AND p.status <> 'pending' THEN RETURN 'duplicate'; END IF;

  IF _success AND NOT _pending THEN
    IF _amount_cents <> p.amount_cents THEN
      v_status := 'amount_mismatch';
    ELSE
      SELECT * INTO b FROM public.bookings WHERE id = p.booking_id FOR UPDATE;
      v_ptype := CASE WHEN lower(COALESCE(_source_type,'')) = 'wallet' THEN 'wallet'::public.payment_type ELSE 'other'::public.payment_type END;
      INSERT INTO public.payments (patient_name, patient_phone, amount, transaction_id, payment_type, payment_type_detail, status, booking_id, matched_at, notes)
      VALUES (b.patient_name, b.phone, p.amount_cents / 100, 'PAYMOB-' || _transaction_id::text, v_ptype,
              'Paymob - ' || CASE WHEN lower(COALESCE(_source_type,'')) = 'wallet' THEN 'محفظة' ELSE 'بطاقة' END,
              'paid', p.booking_id::text, now(), 'دفع إلكتروني ' || p.reference || ' (' || p.mode || ')')
      RETURNING id INTO v_pay;
      UPDATE public.bookings SET payment_status = 'paid', updated_at = now() WHERE id = p.booking_id;
      INSERT INTO public.payment_notifications (payment_id, patient_name, amount, message, is_read)
      VALUES (v_pay, b.patient_name, p.amount_cents / 100,
              'تم استلام دفعة إلكترونية عبر Paymob من ' || b.patient_name || ' بقيمة ' || (p.amount_cents / 100) || ' ج.م - ' || p.reference, false);
      v_status := 'paid';
    END IF;
  ELSE
    v_status := 'failed';
  END IF;

  UPDATE public.paymob_payments SET status = v_status, transaction_id = _transaction_id,
    paymob_order_id = COALESCE(paymob_order_id, _paymob_order_id), source_type = _source_type,
    payment_id = COALESCE(v_pay, payment_id), raw_callback = _raw, updated_at = now()
  WHERE id = p.id;
  RETURN v_status;
END $$;
REVOKE ALL ON FUNCTION public.paymob_apply_transaction(text,bigint,bigint,integer,boolean,boolean,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paymob_apply_transaction(text,bigint,bigint,integer,boolean,boolean,text,jsonb) TO service_role;
