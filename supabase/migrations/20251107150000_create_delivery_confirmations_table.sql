-- Story 4.1: Create Delivery Confirmations Table
-- Epic 4: Delivery Confirmation & Payment Processing
--
-- This migration creates the delivery_confirmations and delivery_photos tables
-- to support the site supervisor delivery verification workflow.

-- ============================================================================
-- 1. Create Delivery Confirmations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  purchase_order_id UUID NOT NULL UNIQUE REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  confirmed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Confirmation Details
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_date DATE NOT NULL,

  -- Digital Signature
  signature_data_url TEXT NOT NULL, -- base64 data URL of signature image

  -- Verification Checklist (JSONB for flexibility)
  checklist JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "items_match_po": true,
  --   "no_damage": true,
  --   "correct_quantity": true,
  --   "packaging_intact": true
  -- }

  -- Issues and Notes
  has_issues BOOLEAN DEFAULT FALSE,
  issues_description TEXT,
  notes TEXT,

  -- Verification Status
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'disputed')),
  verified_by_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_confirmation_date CHECK (
    delivery_date <= CURRENT_DATE
  ),
  CONSTRAINT valid_verification CHECK (
    (verification_status != 'verified' OR (verified_by_manager_id IS NOT NULL AND verified_at IS NOT NULL))
  ),
  CONSTRAINT valid_issues CHECK (
    (has_issues = FALSE) OR (has_issues = TRUE AND issues_description IS NOT NULL)
  )
);

-- Add comment on table
COMMENT ON TABLE public.delivery_confirmations IS 'Stores delivery confirmations from site supervisors with photos and signatures';

-- ============================================================================
-- 2. Create Delivery Photos Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_photos (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  delivery_confirmation_id UUID NOT NULL REFERENCES public.delivery_confirmations(id) ON DELETE CASCADE,

  -- Photo Details
  photo_url TEXT NOT NULL,
  photo_storage_path TEXT NOT NULL, -- Path in Supabase Storage
  caption TEXT,

  -- Photo Metadata
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_photo_url CHECK (photo_url IS NOT NULL AND photo_url != ''),
  CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT valid_dimensions CHECK (
    (width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)
  )
);

-- Add comment on table
COMMENT ON TABLE public.delivery_photos IS 'Stores photos attached to delivery confirmations';

-- ============================================================================
-- 3. Create Indexes for Performance
-- ============================================================================

-- Delivery confirmations indexes
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_po_id ON public.delivery_confirmations(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_project_id ON public.delivery_confirmations(project_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_confirmed_by ON public.delivery_confirmations(confirmed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_status ON public.delivery_confirmations(verification_status);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_date ON public.delivery_confirmations(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_created_at ON public.delivery_confirmations(created_at DESC);

-- Delivery photos indexes
CREATE INDEX IF NOT EXISTS idx_delivery_photos_confirmation_id ON public.delivery_photos(delivery_confirmation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_sort_order ON public.delivery_photos(delivery_confirmation_id, sort_order);

-- ============================================================================
-- 4. Create Trigger for Updated At Timestamp
-- ============================================================================

DROP TRIGGER IF EXISTS update_delivery_confirmations_updated_at ON public.delivery_confirmations;

CREATE TRIGGER update_delivery_confirmations_updated_at
BEFORE UPDATE ON public.delivery_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. Create Function to Update PO Status on Delivery
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_po_status_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update purchase order status to 'delivered'
  UPDATE public.purchase_orders
  SET
    status = 'delivered',
    actual_delivery_date = NEW.delivery_date,
    updated_at = NOW()
  WHERE id = NEW.purchase_order_id;

  -- Log activity
  INSERT INTO public.project_activities (
    project_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.project_id,
    'delivery_confirmed',
    'Delivery confirmed for purchase order',
    jsonb_build_object(
      'delivery_confirmation_id', NEW.id,
      'purchase_order_id', NEW.purchase_order_id,
      'confirmed_by_user_id', NEW.confirmed_by_user_id,
      'delivery_date', NEW.delivery_date,
      'has_issues', NEW.has_issues
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_po_status_on_delivery() IS 'Updates purchase order status to delivered and logs activity when delivery confirmed';

DROP TRIGGER IF EXISTS trigger_update_po_on_delivery ON public.delivery_confirmations;

CREATE TRIGGER trigger_update_po_on_delivery
AFTER INSERT ON public.delivery_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_po_status_on_delivery();

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Create RLS Policies for delivery_confirmations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view project delivery confirmations" ON public.delivery_confirmations;
-- Policy: Users can view delivery confirmations for their projects
CREATE POLICY "Users can view project delivery confirmations"
ON public.delivery_confirmations
FOR SELECT
USING (
  public.has_project_access(auth.uid(), project_id)
  OR confirmed_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Supervisors can create delivery confirmations" ON public.delivery_confirmations;
-- Policy: Supervisors can create delivery confirmations
CREATE POLICY "Supervisors can create delivery confirmations"
ON public.delivery_confirmations
FOR INSERT
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
  OR auth.uid() = confirmed_by_user_id
);

DROP POLICY IF EXISTS "Users can update delivery confirmations" ON public.delivery_confirmations;
-- Policy: Project managers and supervisors can update confirmations
CREATE POLICY "Users can update delivery confirmations"
ON public.delivery_confirmations
FOR UPDATE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
)
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Admins can delete delivery confirmations" ON public.delivery_confirmations;
-- Policy: Only admins can delete delivery confirmations
CREATE POLICY "Admins can delete delivery confirmations"
ON public.delivery_confirmations
FOR DELETE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- ============================================================================
-- 8. Create RLS Policies for delivery_photos
-- ============================================================================

DROP POLICY IF EXISTS "Users can view delivery photos" ON public.delivery_photos;
-- Policy: Users can view delivery photos (inherit from confirmation access)
CREATE POLICY "Users can view delivery photos"
ON public.delivery_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_confirmations dc
    WHERE dc.id = delivery_confirmation_id
      AND (
        public.has_project_access(auth.uid(), dc.project_id)
        OR dc.confirmed_by_user_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Users can insert delivery photos" ON public.delivery_photos;
-- Policy: Users can insert delivery photos
CREATE POLICY "Users can insert delivery photos"
ON public.delivery_photos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.delivery_confirmations dc
    WHERE dc.id = delivery_confirmation_id
      AND public.has_project_admin_access(auth.uid(), dc.project_id)
  )
);

DROP POLICY IF EXISTS "Users can delete delivery photos" ON public.delivery_photos;
-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete delivery photos"
ON public.delivery_photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_confirmations dc
    WHERE dc.id = delivery_confirmation_id
      AND public.has_project_admin_access(auth.uid(), dc.project_id)
  )
);

-- ============================================================================
-- 9. Grant Permissions
-- ============================================================================

-- Grant usage on the tables
GRANT SELECT, INSERT, UPDATE ON public.delivery_confirmations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.delivery_photos TO authenticated;
GRANT DELETE ON public.delivery_confirmations TO service_role;

-- Grant execute permission on trigger function
GRANT EXECUTE ON FUNCTION public.update_po_status_on_delivery() TO authenticated;
