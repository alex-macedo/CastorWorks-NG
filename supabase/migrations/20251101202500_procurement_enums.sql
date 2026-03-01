DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'project_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'phase_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.phase_status AS ENUM ('pending', 'in_progress', 'completed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'weather_condition'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.weather_condition AS ENUM ('sunny', 'cloudy', 'rainy', 'stormy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'entry_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.entry_type AS ENUM ('income', 'expense');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'request_priority'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'request_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.request_status AS ENUM ('pending', 'quoted', 'approved', 'ordered', 'delivered', 'cancelled');
  END IF;
END $$;
