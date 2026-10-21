-- Staff invitations: people allowed to set up their own staff password on first visit.
CREATE TABLE public.staff_invites (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  login_username text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff invites"
ON public.staff_invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- When an invited email is confirmed, create the staff profile and role.
CREATE OR REPLACE FUNCTION public.claim_staff_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.staff_invites%ROWTYPE;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO inv FROM public.staff_invites
  WHERE email = lower(trim(NEW.email)) AND claimed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, name, login_username, permissions, is_active)
  VALUES (NEW.id, inv.name, inv.login_username, inv.permissions, true)
  ON CONFLICT (user_id) DO UPDATE
    SET name = EXCLUDED.name,
        login_username = COALESCE(EXCLUDED.login_username, public.profiles.login_username),
        permissions = EXCLUDED.permissions,
        is_active = true,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.staff_invites
  SET claimed_by = NEW.id, claimed_at = now()
  WHERE email = inv.email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'claim_staff_invite failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_staff_invite() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_confirmed_claim_invite
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.claim_staff_invite();

-- First administrator chosen by the clinic owner.
INSERT INTO public.staff_invites (email, name, role, permissions)
VALUES ('rjb662450@gmail.com', 'مدير النظام', 'admin', '[]'::jsonb)
ON CONFLICT (email) DO NOTHING;