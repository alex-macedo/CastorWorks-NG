-- Enable realtime for maintenance_settings table
ALTER TABLE public.maintenance_settings REPLICA IDENTITY FULL;

-- Enable realtime for scheduled_maintenance table  
ALTER TABLE public.scheduled_maintenance REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel rel
    JOIN pg_publication pub ON pub.oid = rel.prpubid
    WHERE pub.pubname = 'supabase_realtime'
      AND rel.prrelid = 'public.maintenance_settings'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_settings;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel rel
    JOIN pg_publication pub ON pub.oid = rel.prpubid
    WHERE pub.pubname = 'supabase_realtime'
      AND rel.prrelid = 'public.scheduled_maintenance'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_maintenance;
  END IF;
END;
$$;
