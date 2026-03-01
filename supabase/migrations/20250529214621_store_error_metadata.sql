-- 1) Add metadata column if missing
ALTER TABLE content.error
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2) Ensure the metadata schema constraint is in the desired shape

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'constraint_content_error_metadata_schema'
      AND conrelid = 'content.error'::regclass
  ) THEN
    ALTER TABLE content.error
      DROP CONSTRAINT constraint_content_error_metadata_schema;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'constraint_content_error_metadata_schema'
      AND conrelid = 'content.error'::regclass
  ) THEN
    ALTER TABLE content.error
      ADD CONSTRAINT constraint_content_error_metadata_schema CHECK (
        jsonb_matches_schema(
          '{
            "type": "object",
            "properties": {
              "references": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "href": { "type": "string" },
                    "description": { "type": "string" }
                  },
                  "required": ["href", "description"]
                }
              }
            }
          }',
          metadata
        )
      );
  END IF;
END;
$$;

-- 3) Upgrade update_error_code to include metadata, safely

DROP FUNCTION IF EXISTS content.update_error_code(
  text,
  text,
  smallint,
  text
);

DROP FUNCTION IF EXISTS content.update_error_code(
  text,
  text,
  smallint,
  text,
  jsonb
);

CREATE OR REPLACE FUNCTION content.update_error_code(
  code text,
  service text,
  http_status_code smallint DEFAULT NULL,
  message text DEFAULT NULL,
  metadata jsonb DEFAULT NULL
)
RETURNS boolean
SET search_path = ''
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
DECLARE
  service_id uuid;
  result boolean;
BEGIN
  INSERT INTO content.service (name)
  VALUES (service)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO service_id
  FROM content.service
  WHERE name = service;

  INSERT INTO content.error (
    service,
    code,
    http_status_code,
    message,
    metadata
  )
  VALUES (service_id, code, http_status_code, message, metadata)
  ON CONFLICT ON CONSTRAINT error_pkey DO
    UPDATE SET
      http_status_code = excluded.http_status_code,
      message = excluded.message,
      metadata = excluded.metadata
    WHERE
      error.service = service_id
      AND error.code = code
      AND (
        error.http_status_code IS DISTINCT FROM excluded.http_status_code
        OR error.message IS DISTINCT FROM excluded.message
        OR error.metadata IS DISTINCT FROM excluded.metadata
      )
    RETURNING true INTO result;

  RETURN coalesce(result, false);
END;
$$;
