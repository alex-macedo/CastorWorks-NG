-- Add missing columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS construction_unit text;

-- Add missing columns to project_team_members table
ALTER TABLE public.project_team_members 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS access_role text;

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned',
  category text,
  upvotes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on roadmap_items
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmap_items
DROP POLICY IF EXISTS "authenticated_select_roadmap_items_v2" ON public.roadmap_items;
CREATE POLICY "authenticated_select_roadmap_items_v2" ON public.roadmap_items
  FOR SELECT TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert roadmap items" ON public.roadmap_items;
CREATE POLICY "Authenticated users can insert roadmap items" ON public.roadmap_items
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can update roadmap items" ON public.roadmap_items
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own roadmap items" ON public.roadmap_items;
CREATE POLICY "Users can delete their own roadmap items" ON public.roadmap_items
  FOR DELETE USING (created_by = auth.uid());

-- Create roadmap_item_upvotes table
CREATE TABLE IF NOT EXISTS public.roadmap_item_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(roadmap_item_id, user_id)
);

-- Enable RLS on roadmap_item_upvotes
ALTER TABLE public.roadmap_item_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_upvotes_v2" ON public.roadmap_item_upvotes;
CREATE POLICY "authenticated_select_upvotes_v2" ON public.roadmap_item_upvotes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can manage their upvotes" ON public.roadmap_item_upvotes;
CREATE POLICY "Authenticated users can manage their upvotes" ON public.roadmap_item_upvotes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create roadmap_item_comments table
CREATE TABLE IF NOT EXISTS public.roadmap_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on roadmap_item_comments
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_comments_v2" ON public.roadmap_item_comments;
CREATE POLICY "authenticated_select_comments_v2" ON public.roadmap_item_comments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.roadmap_item_comments;
CREATE POLICY "Authenticated users can insert comments" ON public.roadmap_item_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.roadmap_item_comments;
CREATE POLICY "Users can update their own comments" ON public.roadmap_item_comments
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.roadmap_item_comments;
CREATE POLICY "Users can delete their own comments" ON public.roadmap_item_comments
  FOR DELETE USING (user_id = auth.uid());

-- Create roadmap_item_attachments table
CREATE TABLE IF NOT EXISTS public.roadmap_item_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on roadmap_item_attachments
ALTER TABLE public.roadmap_item_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_attachments_v2" ON public.roadmap_item_attachments;
CREATE POLICY "authenticated_select_attachments_v2" ON public.roadmap_item_attachments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.roadmap_item_attachments;
CREATE POLICY "Authenticated users can upload attachments" ON public.roadmap_item_attachments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.roadmap_item_attachments;
CREATE POLICY "Users can delete their own attachments" ON public.roadmap_item_attachments
  FOR DELETE USING (user_id = auth.uid());

-- Create quote_approval_logs table
CREATE TABLE IF NOT EXISTS public.quote_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  action text NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on quote_approval_logs
ALTER TABLE public.quote_approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view approval logs" ON public.quote_approval_logs;
CREATE POLICY "Authenticated users can view approval logs" ON public.quote_approval_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.quotes q
      JOIN public.purchase_request_items pri ON pri.id = q.purchase_request_item_id
      JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE q.id = quote_id
      AND has_project_access(auth.uid(), ppr.project_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert approval logs" ON public.quote_approval_logs;
CREATE POLICY "Authenticated users can insert approval logs" ON public.quote_approval_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quotes q
      JOIN public.purchase_request_items pri ON pri.id = q.purchase_request_item_id
      JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE q.id = quote_id
      AND has_project_access(auth.uid(), ppr.project_id)
    )
  );

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid REFERENCES public.project_purchase_requests(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  response_deadline timestamp with time zone,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on quote_requests
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage quote requests" ON public.quote_requests;
CREATE POLICY "Authenticated users can manage quote requests" ON public.quote_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_purchase_requests ppr
      WHERE ppr.id = purchase_request_id
      AND has_project_access(auth.uid(), ppr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_purchase_requests ppr
      WHERE ppr.id = purchase_request_id
      AND has_project_access(auth.uid(), ppr.project_id)
    )
  );
