-- Migration: Create milestone comments table for threaded discussions
-- Purpose: Replace JSONB comments with a structured threaded comments table
-- Date: 2026-02-20

BEGIN;

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.milestone_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES public.project_milestone_definitions(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.milestone_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add comments for documentation
COMMENT ON TABLE public.milestone_comments IS 'Stores threaded comments for project milestones.';
COMMENT ON COLUMN public.milestone_comments.parent_id IS 'ID of the parent comment, enabling threaded replies.';
COMMENT ON COLUMN public.milestone_comments.attachment_url IS 'Optional URL to an attachment relevant to the comment.';

-- 3. Enable RLS
ALTER TABLE public.milestone_comments ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
CREATE POLICY "Users can view comments for accessible projects"
ON public.milestone_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_milestone_definitions m
        WHERE m.id = milestone_id
        AND has_project_access(auth.uid(), m.project_id)
    )
);

CREATE POLICY "Users can insert their own comments"
ON public.milestone_comments FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.project_milestone_definitions m
        WHERE m.id = milestone_id
        AND has_project_access(auth.uid(), m.project_id)
    )
);

CREATE POLICY "Users can update their own comments"
ON public.milestone_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.milestone_comments FOR DELETE
USING (auth.uid() = user_id);

-- 5. Create Indexes
CREATE INDEX idx_milestone_comments_milestone_id ON public.milestone_comments(milestone_id);
CREATE INDEX idx_milestone_comments_parent_id ON public.milestone_comments(parent_id);
CREATE INDEX idx_milestone_comments_user_id ON public.milestone_comments(user_id);

-- 6. Add updated_at trigger
CREATE TRIGGER update_milestone_comments_updated_at
  BEFORE UPDATE ON public.milestone_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Data Migration
-- Copy existing JSONB comments to the new table
INSERT INTO public.milestone_comments (milestone_id, user_id, content, created_at)
SELECT 
    m.id as milestone_id,
    (comment->>'userId')::uuid as user_id,
    comment->>'text' as content,
    COALESCE((comment->>'timestamp')::timestamptz, m.created_at) as created_at
FROM 
    public.project_milestone_definitions m,
    jsonb_array_elements(m.comments) as comment
WHERE 
    m.comments IS NOT NULL 
    AND jsonb_typeof(m.comments) = 'array'
    AND (comment->>'userId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (comment->>'userId')::uuid);

COMMIT;
