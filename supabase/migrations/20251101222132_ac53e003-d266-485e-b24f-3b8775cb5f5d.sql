-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  avatar_initial TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0.0,
  orders_completed INTEGER DEFAULT 0,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_request_item_id UUID REFERENCES public.purchase_request_items(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  delivery_days INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'project_scoped_select_clients'
  ) THEN
    CREATE POLICY "project_scoped_select_clients" ON public.clients FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.client_id = clients.id
          AND has_project_access(auth.uid(), projects.id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'project_scoped_insert_clients'
  ) THEN
    CREATE POLICY "project_scoped_insert_clients" ON public.clients FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'project_scoped_update_clients'
  ) THEN
    CREATE POLICY "project_scoped_update_clients" ON public.clients FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.client_id = clients.id
          AND has_project_access(auth.uid(), projects.id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.client_id = clients.id
          AND has_project_access(auth.uid(), projects.id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'project_scoped_delete_clients'
  ) THEN
    CREATE POLICY "project_scoped_delete_clients" ON public.clients FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.client_id = clients.id
          AND has_project_access(auth.uid(), projects.id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_select_suppliers'
  ) THEN
    CREATE POLICY "authenticated_select_suppliers" ON public.suppliers FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_insert_suppliers'
  ) THEN
    CREATE POLICY "authenticated_insert_suppliers" ON public.suppliers FOR INSERT
      TO authenticated
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_update_suppliers'
  ) THEN
    CREATE POLICY "authenticated_update_suppliers" ON public.suppliers FOR UPDATE
      TO authenticated
      USING ((auth.jwt() ->> 'role') = 'service_role')
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_delete_suppliers'
  ) THEN
    CREATE POLICY "authenticated_delete_suppliers" ON public.suppliers FOR DELETE
      TO authenticated
      USING ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_scoped_select_quotes'
  ) THEN
    CREATE POLICY "project_scoped_select_quotes" ON public.quotes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_scoped_insert_quotes'
  ) THEN
    CREATE POLICY "project_scoped_insert_quotes" ON public.quotes FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_scoped_update_quotes'
  ) THEN
    CREATE POLICY "project_scoped_update_quotes" ON public.quotes FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_scoped_delete_quotes'
  ) THEN
    CREATE POLICY "project_scoped_delete_quotes" ON public.quotes FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'project_scoped_select_activity_logs'
  ) THEN
    CREATE POLICY "project_scoped_select_activity_logs" ON public.activity_logs FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'project_scoped_insert_activity_logs'
  ) THEN
    CREATE POLICY "project_scoped_insert_activity_logs" ON public.activity_logs FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'project_scoped_update_activity_logs'
  ) THEN
    CREATE POLICY "project_scoped_update_activity_logs" ON public.activity_logs FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'project_scoped_delete_activity_logs'
  ) THEN
    CREATE POLICY "project_scoped_delete_activity_logs" ON public.activity_logs FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_clients_updated_at' AND tgrelid = 'public.clients'::regclass
  ) THEN
    CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_suppliers_updated_at' AND tgrelid = 'public.suppliers'::regclass
  ) THEN
    CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quotes_updated_at' AND tgrelid = 'public.quotes'::regclass
  ) THEN
    CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
