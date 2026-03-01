-- Make delete_error_codes_except safe to re-run
DROP FUNCTION IF EXISTS content.delete_error_codes_except(jsonb);

CREATE OR REPLACE FUNCTION content.delete_error_codes_except(
    skip_codes jsonb
)
RETURNS void
SET search_path = ''
LANGUAGE sql
AS $$
    DELETE FROM content.error
    WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(skip_codes) skipped
        JOIN content.service
          ON service.name = (skipped ->> 'service')
        WHERE service.id = error.service
          AND error.code = (skipped ->> 'error_code')
    );
$$;
