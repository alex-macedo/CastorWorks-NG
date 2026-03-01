-- Fix roadmap_items overly permissive RLS policies
-- Remove qual=true SELECT policy and restrict UPDATE policy to owner/admin only

BEGIN;

-- Enable RLS on roadmap_items
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- Drop the permissive SELECT policy that allows all users to see all items
DROP POLICY IF EXISTS "Users can view all roadmap items" ON public.roadmap_items;

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update roadmap items" ON public.roadmap_items;

-- Create scoped SELECT policy: users can view items they created OR admins can view all
DROP POLICY IF EXISTS "Roadmap items select - owner or admin" ON public.roadmap_items;
CREATE POLICY "Roadmap items select - owner or admin"
  ON public.roadmap_items
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create scoped UPDATE policy: users can update only their own items OR admins can update all
DROP POLICY IF EXISTS "Roadmap items update - owner or admin" ON public.roadmap_items;
CREATE POLICY "Roadmap items update - owner or admin"
  ON public.roadmap_items
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    has_role(auth.uid(), 'admin'::app_role)
  );

COMMIT;
