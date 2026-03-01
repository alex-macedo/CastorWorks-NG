-- CastorWorks News Module: Content Hub Table
-- Stores news, articles, documents (text-based), and FAQs with workflow management

-- Create enums for content types and statuses
CREATE TYPE content_type AS ENUM ('news', 'article', 'document', 'faq');
CREATE TYPE content_status AS ENUM ('draft', 'pending_approval', 'published', 'archived');

-- Create the content_hub table
CREATE TABLE content_hub (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type content_type NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    status content_status NOT NULL DEFAULT 'draft',
    visibility TEXT[] NOT NULL DEFAULT ARRAY['admin']::TEXT[],
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_content_hub_slug ON content_hub(slug);
CREATE INDEX idx_content_hub_status ON content_hub(status);
CREATE INDEX idx_content_hub_type ON content_hub(type);
CREATE INDEX idx_content_hub_author_id ON content_hub(author_id);
CREATE INDEX idx_content_hub_published_at ON content_hub(published_at);
CREATE INDEX idx_content_hub_visibility ON content_hub USING GIN(visibility);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_content_hub_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_hub_updated_at
    BEFORE UPDATE ON content_hub
    FOR EACH ROW
    EXECUTE FUNCTION update_content_hub_updated_at();

-- Add comments for documentation
COMMENT ON TABLE content_hub IS 'CastorWorks News Module - stores news, articles, documents, and FAQs with professional workflow management';
COMMENT ON COLUMN content_hub.type IS 'Content type: news, article, document, or faq';
COMMENT ON COLUMN content_hub.title IS 'Content title (required)';
COMMENT ON COLUMN content_hub.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN content_hub.content IS 'Main content body (supports rich text/markdown)';
COMMENT ON COLUMN content_hub.status IS 'Workflow state: draft, pending_approval, published, or archived';
COMMENT ON COLUMN content_hub.visibility IS 'Array of roles that can view this content (e.g., admin, editor, engineer, contractor, client)';
COMMENT ON COLUMN content_hub.author_id IS 'User who created the content';
COMMENT ON COLUMN content_hub.approved_by IS 'User who approved/published the content (admin or editor only)';
COMMENT ON COLUMN content_hub.published_at IS 'Timestamp when content was published (null for drafts)';
COMMENT ON COLUMN content_hub.metadata IS 'Flexible JSON field for categories, tags, featured images, attachments, etc.';
