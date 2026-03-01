-- Create seed data registry table to track seeded records
CREATE TABLE IF NOT EXISTS public.seed_data_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  seed_batch_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'seed_data_registry'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'seed_data_registry'
        AND column_name = 'seed_batch_id'
    ) THEN
      ALTER TABLE public.seed_data_registry
        ADD COLUMN seed_batch_id UUID NOT NULL DEFAULT gen_random_uuid();
      UPDATE public.seed_data_registry
        SET seed_batch_id = gen_random_uuid()
        WHERE seed_batch_id IS NULL;
      ALTER TABLE public.seed_data_registry
        ALTER COLUMN seed_batch_id DROP DEFAULT;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'seed_data_registry'
        AND column_name = 'entity_type'
    ) THEN
      ALTER TABLE public.seed_data_registry
        ADD COLUMN entity_type TEXT NOT NULL DEFAULT '';
      UPDATE public.seed_data_registry
        SET entity_type = ''
        WHERE entity_type IS NULL;
      ALTER TABLE public.seed_data_registry
        ALTER COLUMN entity_type DROP DEFAULT;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'seed_data_registry'
        AND column_name = 'entity_id'
    ) THEN
      ALTER TABLE public.seed_data_registry
        ADD COLUMN entity_id UUID NOT NULL DEFAULT gen_random_uuid();
      UPDATE public.seed_data_registry
        SET entity_id = gen_random_uuid()
        WHERE entity_id IS NULL;
      ALTER TABLE public.seed_data_registry
        ALTER COLUMN entity_id DROP DEFAULT;
    END IF;
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE public.seed_data_registry ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'seed_data_registry'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage seed data registry" ON public.seed_data_registry;
    CREATE POLICY "Admins can manage seed data registry"
      ON public.seed_data_registry
      FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END;
$$;

 -- Create index for faster lookups
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'seed_data_registry'
       AND column_name = 'seed_batch_id'
   ) THEN
     CREATE INDEX IF NOT EXISTS idx_seed_data_registry_batch ON public.seed_data_registry(seed_batch_id);
   END IF;
 END;
 $$;
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'seed_data_registry'
       AND column_name = 'entity_type'
   ) AND EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'seed_data_registry'
       AND column_name = 'entity_id'
   ) THEN
     CREATE INDEX IF NOT EXISTS idx_seed_data_registry_entity ON public.seed_data_registry(entity_type, entity_id);
   END IF;
 END;
 $$;

 -- Add comment
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'seed_data_registry'
   ) THEN
     COMMENT ON TABLE public.seed_data_registry IS 
       'Tracks seeded sample data for easy identification and cleanup. Used for testing and demos.';
   END IF;
 END;
 $$;
