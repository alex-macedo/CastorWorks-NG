-- Create time_logs table for supervisor crew time tracking
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_name TEXT NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0),
  activity TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

 -- Create policies for time_logs
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'time_logs'
   ) THEN
     DROP POLICY IF EXISTS "Users can view time logs for their projects" ON public.time_logs;
     DROP POLICY IF EXISTS "Users can create time logs for their projects" ON public.time_logs;
     DROP POLICY IF EXISTS "Users can update their own time logs" ON public.time_logs;
     DROP POLICY IF EXISTS "Users can delete their own time logs" ON public.time_logs;

     EXECUTE '
       CREATE POLICY "Users can view time logs for their projects"
       ON public.time_logs
       FOR SELECT
       USING (
         EXISTS (
           SELECT 1 FROM public.projects
           WHERE projects.id = time_logs.project_id
             AND projects.owner_id = auth.uid()
         )
       )
     ';

     EXECUTE '
       CREATE POLICY "Users can create time logs for their projects"
       ON public.time_logs
       FOR INSERT
       WITH CHECK (
         EXISTS (
           SELECT 1 FROM public.projects
           WHERE projects.id = time_logs.project_id
             AND projects.owner_id = auth.uid()
         )
         AND logged_by = auth.uid()
       )
     ';

     EXECUTE '
       CREATE POLICY "Users can update their own time logs"
       ON public.time_logs
       FOR UPDATE
       USING (logged_by = auth.uid())
     ';

     EXECUTE '
       CREATE POLICY "Users can delete their own time logs"
       ON public.time_logs
       FOR DELETE
       USING (logged_by = auth.uid())
     ';
   END IF;
 END;
 $$;

 -- Create index for faster queries
 CREATE INDEX IF NOT EXISTS idx_time_logs_project_date ON public.time_logs(project_id, log_date DESC);
 CREATE INDEX IF NOT EXISTS idx_time_logs_logged_by ON public.time_logs(logged_by);

 -- Create trigger for automatic timestamp updates
 DROP TRIGGER IF EXISTS update_time_logs_updated_at ON public.time_logs;
 CREATE TRIGGER update_time_logs_updated_at
 BEFORE UPDATE ON public.time_logs
 FOR EACH ROW
 EXECUTE FUNCTION public.update_updated_at_column();
