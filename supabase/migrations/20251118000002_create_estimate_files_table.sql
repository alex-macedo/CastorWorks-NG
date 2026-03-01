-- =====================================================
-- Create Estimate Files Table
-- =====================================================
-- Migration: 20251118000002
-- Description: Track uploaded files for AI processing
-- Dependencies: estimates table
-- =====================================================

CREATE TABLE IF NOT EXISTS estimate_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- File metadata
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size BIGINT, -- bytes
  thumbnail_url TEXT,

  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),

  -- AI extracted data (flexible JSONB structure)
  ai_extracted_data JSONB DEFAULT '{}'::jsonb,

  -- Performance tracking
  ai_processing_time_ms INTEGER,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_estimate_files_estimate_id ON estimate_files(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_files_user_id ON estimate_files(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_files_status ON estimate_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_estimate_files_created_at ON estimate_files(created_at DESC);

-- GIN index for searching extracted data
CREATE INDEX IF NOT EXISTS idx_estimate_files_extracted_data ON estimate_files USING GIN(ai_extracted_data);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE estimate_files IS 'Files uploaded for AI processing (OCR, image analysis)';
COMMENT ON COLUMN estimate_files.ai_extracted_data IS 'Contains: {rawText, dimensions[], materials[], quantities[], brands[], specifications[], confidence, analysisType}';
COMMENT ON COLUMN estimate_files.processing_status IS 'Workflow: pending -> processing -> completed|failed';

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE estimate_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own estimate files" ON estimate_files;
DROP POLICY IF EXISTS "Users can view estimate files for accessible estimates" ON estimate_files;
DROP POLICY IF EXISTS "Users can upload estimate files" ON estimate_files;
DROP POLICY IF EXISTS "Users can delete own estimate files" ON estimate_files;
DROP POLICY IF EXISTS "Users can update own estimate files" ON estimate_files;
DROP POLICY IF EXISTS "Admins can manage all estimate files" ON estimate_files;

-- Users can view their own files
CREATE POLICY "Users can view own estimate files"
ON estimate_files FOR SELECT
USING (user_id = auth.uid());

-- Users can view files for estimates they have access to
CREATE POLICY "Users can view estimate files for accessible estimates"
ON estimate_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM estimates e
    WHERE e.id = estimate_files.estimate_id
      AND e.user_id = auth.uid()
  )
);

-- Users can upload files for their own estimates
CREATE POLICY "Users can upload estimate files"
ON estimate_files FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own pending/failed files
CREATE POLICY "Users can delete own estimate files"
ON estimate_files FOR DELETE
USING (
  user_id = auth.uid()
  AND processing_status IN ('pending', 'failed')
);

-- Users can update their own files' processing status
-- Note: Edge Functions use SECURITY DEFINER function update_file_processing_status()
-- which bypasses RLS, so this policy only applies to authenticated user updates
CREATE POLICY "Users can update own estimate files"
ON estimate_files FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all files
CREATE POLICY "Admins can manage all estimate files"
ON estimate_files FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update file processing status
CREATE OR REPLACE FUNCTION update_file_processing_status(
  p_file_id UUID,
  p_status TEXT,
  p_extracted_data JSONB DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE estimate_files
  SET
    processing_status = p_status,
    ai_extracted_data = COALESCE(p_extracted_data, ai_extracted_data),
    ai_processing_time_ms = COALESCE(p_processing_time_ms, ai_processing_time_ms),
    error_message = p_error_message
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_file_processing_status(UUID, TEXT, JSONB, INTEGER, TEXT) TO authenticated, service_role;
