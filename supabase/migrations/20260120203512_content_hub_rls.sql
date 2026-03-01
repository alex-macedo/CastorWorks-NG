-- CastorWorks News Module: Row Level Security Policies
-- Implements secure access control and approval workflow

-- Enable Row Level Security
ALTER TABLE content_hub ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's role(s)
-- Returns an array of roles for the currently authenticated user
CREATE OR REPLACE FUNCTION auth.user_roles()
RETURNS TEXT[] AS $$
    SELECT COALESCE(
        ARRAY_AGG(role::TEXT),
        ARRAY[]::TEXT[]
    )
    FROM user_roles
    WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policy 1: SELECT - Published content visible based on visibility array
-- Users can only see published content if their role matches the visibility array
CREATE POLICY "Published content visible to authorized roles"
    ON content_hub FOR SELECT
    USING (
        status = 'published'
        AND visibility && auth.user_roles()
    );

-- Policy 2: SELECT - Drafts/Pending visible to Admins, Editors, and Author
-- Authors can see their own drafts, admins and editors can see all drafts
CREATE POLICY "Drafts visible to author, admins, and editors"
    ON content_hub FOR SELECT
    USING (
        status IN ('draft', 'pending_approval')
        AND (
            author_id = auth.uid()
            OR 'admin' = ANY(auth.user_roles())
            OR 'editor' = ANY(auth.user_roles())
        )
    );

-- Policy 3: SELECT - Archived content visible to Admins and Editors only
CREATE POLICY "Archived content visible to admins and editors"
    ON content_hub FOR SELECT
    USING (
        status = 'archived'
        AND (
            'admin' = ANY(auth.user_roles())
            OR 'editor' = ANY(auth.user_roles())
        )
    );

-- Policy 4: INSERT - Authenticated users can create drafts
-- Any authenticated user can create content, but it starts as a draft
CREATE POLICY "Users can create content as draft"
    ON content_hub FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND status = 'draft'
    );

-- Policy 5: UPDATE - Author can update their own drafts
-- Authors can only edit their own content while it's in draft status
CREATE POLICY "Authors can update their own drafts"
    ON content_hub FOR UPDATE
    USING (
        author_id = auth.uid()
        AND status = 'draft'
    )
    WITH CHECK (
        author_id = auth.uid()
        AND status IN ('draft', 'pending_approval')
    );

-- Policy 6: UPDATE - Admins and Editors can update any content
-- Admins and editors have full edit access to all content
CREATE POLICY "Admins and editors can update any content"
    ON content_hub FOR UPDATE
    USING (
        'admin' = ANY(auth.user_roles())
        OR 'editor' = ANY(auth.user_roles())
    );

-- Policy 7: UPDATE - Only Admins/Editors can publish content
-- Publishing requires admin or editor role and sets approved_by and published_at
CREATE POLICY "Only admins and editors can publish content"
    ON content_hub FOR UPDATE
    USING (
        status = 'pending_approval'
        AND (
            'admin' = ANY(auth.user_roles())
            OR 'editor' = ANY(auth.user_roles())
        )
    )
    WITH CHECK (
        status = 'published'
        AND approved_by = auth.uid()
        AND published_at IS NOT NULL
    );

-- Policy 8: DELETE - Authors can delete their own drafts
CREATE POLICY "Authors can delete their own drafts"
    ON content_hub FOR DELETE
    USING (
        author_id = auth.uid()
        AND status = 'draft'
    );

-- Policy 9: DELETE - Admins can delete any content
CREATE POLICY "Admins can delete any content"
    ON content_hub FOR DELETE
    USING (
        'admin' = ANY(auth.user_roles())
    );

-- Add comments for policy documentation
COMMENT ON POLICY "Published content visible to authorized roles" ON content_hub IS 
    'Users can see published content if their role is in the visibility array';
    
COMMENT ON POLICY "Drafts visible to author, admins, and editors" ON content_hub IS 
    'Authors see their own drafts, admins/editors see all drafts and pending content';
    
COMMENT ON POLICY "Only admins and editors can publish content" ON content_hub IS 
    'Approval workflow - only admins/editors can change status from pending_approval to published';
    
COMMENT ON POLICY "Authors can delete their own drafts" ON content_hub IS 
    'Authors can only delete content they created while it is still in draft status';
    
COMMENT ON POLICY "Admins can delete any content" ON content_hub IS 
    'Admins have full delete access regardless of content status';
