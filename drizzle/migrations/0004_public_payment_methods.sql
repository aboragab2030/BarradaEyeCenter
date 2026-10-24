CREATE OR REPLACE FUNCTION public.get_payment_methods()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT payment_methods FROM public.app_settings
  WHERE payment_methods IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_payment_methods() TO anon, authenticated;