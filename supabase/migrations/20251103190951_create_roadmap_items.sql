-- Create ENUMs for roadmap items (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_status') THEN
    CREATE TYPE roadmap_status AS ENUM ('backlog', 'next_up', 'in_progress', 'blocked', 'done');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_priority') THEN
    CREATE TYPE roadmap_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_category') THEN
    CREATE TYPE roadmap_category AS ENUM ('feature', 'bug_fix', 'integration', 'refinement');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_effort') THEN
    CREATE TYPE roadmap_effort AS ENUM ('small', 'medium', 'large', 'xlarge');
  END IF;
END $$;

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status roadmap_status NOT NULL DEFAULT 'backlog',
  priority roadmap_priority NOT NULL DEFAULT 'medium',
  category roadmap_category NOT NULL DEFAULT 'feature',
  due_date DATE,
  estimated_effort roadmap_effort,
  notes TEXT,
  upvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON public.roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_category ON public.roadmap_items(category);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_priority ON public.roadmap_items(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_created_at ON public.roadmap_items(created_at DESC);

-- Create roadmap_item_upvotes table for tracking user upvotes
CREATE TABLE IF NOT EXISTS public.roadmap_item_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roadmap_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_item_upvotes_item ON public.roadmap_item_upvotes(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_item_upvotes_user ON public.roadmap_item_upvotes(user_id);

-- Create roadmap_item_comments table for comments
CREATE TABLE IF NOT EXISTS public.roadmap_item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_item_comments_item ON public.roadmap_item_comments(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_item_comments_created_at ON public.roadmap_item_comments(created_at DESC);

-- Function to update upvotes count
CREATE OR REPLACE FUNCTION update_roadmap_item_upvotes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.roadmap_items
  SET upvotes = (
    SELECT COUNT(*) 
    FROM public.roadmap_item_upvotes 
    WHERE roadmap_item_id = COALESCE(NEW.roadmap_item_id, OLD.roadmap_item_id)
  )
  WHERE id = COALESCE(NEW.roadmap_item_id, OLD.roadmap_item_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update upvotes count
DROP TRIGGER IF EXISTS update_roadmap_upvotes_count ON public.roadmap_item_upvotes;
CREATE TRIGGER update_roadmap_upvotes_count
AFTER INSERT OR DELETE ON public.roadmap_item_upvotes
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_item_upvotes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_roadmap_item_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.roadmap_items
  SET comments_count = (
    SELECT COUNT(*) 
    FROM public.roadmap_item_comments 
    WHERE roadmap_item_id = COALESCE(NEW.roadmap_item_id, OLD.roadmap_item_id)
  )
  WHERE id = COALESCE(NEW.roadmap_item_id, OLD.roadmap_item_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comments count
DROP TRIGGER IF EXISTS update_roadmap_comments_count ON public.roadmap_item_comments;
CREATE TRIGGER update_roadmap_comments_count
AFTER INSERT OR DELETE ON public.roadmap_item_comments
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_item_comments_count();

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmap_items
DROP POLICY IF EXISTS "authenticated_select_roadmap_items" ON public.roadmap_items;
CREATE POLICY "authenticated_select_roadmap_items"
ON public.roadmap_items FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_roadmap_items" ON public.roadmap_items;
CREATE POLICY "authenticated_insert_roadmap_items"
ON public.roadmap_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own roadmap items or admins can update any" ON public.roadmap_items;
CREATE POLICY "Users can update their own roadmap items or admins can update any"
ON public.roadmap_items FOR UPDATE
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete roadmap items" ON public.roadmap_items;
CREATE POLICY "Admins can delete roadmap items"
ON public.roadmap_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- RLS policies for roadmap_item_upvotes
DROP POLICY IF EXISTS "authenticated_select_upvotes" ON public.roadmap_item_upvotes;
CREATE POLICY "authenticated_select_upvotes"
ON public.roadmap_item_upvotes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can upvote" ON public.roadmap_item_upvotes;
CREATE POLICY "Authenticated users can upvote"
ON public.roadmap_item_upvotes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove their own upvotes" ON public.roadmap_item_upvotes;
CREATE POLICY "Users can remove their own upvotes"
ON public.roadmap_item_upvotes FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for roadmap_item_comments
DROP POLICY IF EXISTS "authenticated_select_comments" ON public.roadmap_item_comments;
CREATE POLICY "authenticated_select_comments"
ON public.roadmap_item_comments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.roadmap_item_comments;
CREATE POLICY "Authenticated users can create comments"
ON public.roadmap_item_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.roadmap_item_comments;
CREATE POLICY "Users can update their own comments"
ON public.roadmap_item_comments FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.roadmap_item_comments;
CREATE POLICY "Users can delete their own comments"
ON public.roadmap_item_comments FOR DELETE
USING (user_id = auth.uid());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_roadmap_items_updated_at ON public.roadmap_items;
CREATE TRIGGER update_roadmap_items_updated_at
BEFORE UPDATE ON public.roadmap_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roadmap_item_comments_updated_at ON public.roadmap_item_comments;
CREATE TRIGGER update_roadmap_item_comments_updated_at
BEFORE UPDATE ON public.roadmap_item_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
