BEGIN;

CREATE OR REPLACE FUNCTION public.schedule_status_as_of_date()
RETURNS DATE
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_system_tz TEXT;
BEGIN
  SELECT s.system_time_zone
  INTO v_system_tz
  FROM public.app_settings s
  WHERE s.system_time_zone IS NOT NULL
    AND btrim(s.system_time_zone) <> ''
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.id DESC
  LIMIT 1;

  IF v_system_tz IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names tz
    WHERE tz.name = v_system_tz
  ) THEN
    v_system_tz := 'America/New_York';
  END IF;

  RETURN (NOW() AT TIME ZONE v_system_tz)::DATE;
END;
$$;

COMMENT ON FUNCTION public.schedule_status_as_of_date() IS
  'Returns schedule as-of date using app_settings.system_time_zone (System Preferences), with America/New_York fallback.';

COMMIT;
