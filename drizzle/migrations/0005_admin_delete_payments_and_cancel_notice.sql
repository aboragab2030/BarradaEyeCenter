-- Payments: staff keep read/add/edit, only admins may delete
DROP POLICY IF EXISTS "Staff full access payments" ON public.payments;
CREATE POLICY "Staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete of a payment record (detaches links first)
CREATE OR REPLACE FUNCTION public.delete_payment_record(_payment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.instapay_submissions SET payment_id = NULL WHERE payment_id = _payment_id;
  UPDATE public.paymob_payments SET payment_id = NULL WHERE payment_id = _payment_id;
  DELETE FROM public.payment_notifications WHERE payment_id = _payment_id;
  DELETE FROM public.payments WHERE id = _payment_id;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.delete_payment_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_payment_record(uuid) TO authenticated;

-- Admin-only delete of an InstaPay review request; returns the receipt path so the file can be removed
CREATE OR REPLACE FUNCTION public.delete_instapay_submission(_submission_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_path text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT evidence_path INTO v_path FROM public.instapay_submissions WHERE id = _submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  DELETE FROM public.instapay_audit_events WHERE submission_id = _submission_id;
  DELETE FROM public.instapay_submissions WHERE id = _submission_id;
  RETURN v_path;
END $$;
REVOKE ALL ON FUNCTION public.delete_instapay_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_instapay_submission(uuid) TO authenticated;

CREATE POLICY "Admins delete instapay evidence" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'instapay-evidence' AND public.has_role(auth.uid(), 'admin'));

-- Notice in the payments log when a paid booking is cancelled
CREATE OR REPLACE FUNCTION public.notify_paid_booking_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_found boolean := false; v_detail text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    v_detail := ' - ' || NEW.service || ' - د. ' || NEW.doctor_name || ' - ' || NEW.date || ' ' || NEW.time;
    FOR p IN SELECT id, amount FROM public.payments WHERE booking_id = NEW.id::text AND status = 'paid' LOOP
      v_found := true;
      INSERT INTO public.payment_notifications (payment_id, patient_name, amount, message)
      VALUES (p.id, NEW.patient_name, p.amount, 'تم إلغاء إجراء مدفوع' || v_detail);
    END LOOP;
    IF NOT v_found AND NEW.payment_status = 'paid' THEN
      INSERT INTO public.payment_notifications (payment_id, patient_name, amount, message)
      VALUES (NULL, NEW.patient_name, COALESCE(public.instapay_amount_due(NEW.service, NEW.doctor_id, NEW.doctor_name), 0), 'تم إلغاء إجراء مدفوع' || v_detail);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_paid_booking_cancelled() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_paid_cancel_notice ON public.bookings;
CREATE TRIGGER bookings_paid_cancel_notice AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_paid_booking_cancelled();