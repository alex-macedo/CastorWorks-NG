-- Migration: Add image_url and created_by to all template tables
-- Date: 2026-02-06
-- Description: Add support for template images and author tracking

BEGIN;

-- ============================================
-- 1. Budget Templates (budget_templates)
-- ============================================
-- already has created_by, just add image_url
ALTER TABLE public.budget_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- 2. Phase Templates (phase_templates)
-- ============================================
ALTER TABLE public.phase_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.phase_templates 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 3. Activity Templates (activity_templates)
-- ============================================
ALTER TABLE public.activity_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.activity_templates 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 4. WBS Templates (project_wbs_templates)
-- ============================================
ALTER TABLE public.project_wbs_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.project_wbs_templates 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 5. SimpleBudget Materials Template
-- ============================================
-- Add metadata table for template-level info
CREATE TABLE IF NOT EXISTS public.simplebudget_materials_template_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL DEFAULT 'Materials Template',
  description TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simplebudget_materials_template_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view materials template meta"
  ON public.simplebudget_materials_template_meta FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert materials template meta"
  ON public.simplebudget_materials_template_meta FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update materials template meta"
  ON public.simplebudget_materials_template_meta FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default record if not exists
INSERT INTO public.simplebudget_materials_template_meta (template_name, description)
SELECT 'Materials Template', 'Default template for materials items'
WHERE NOT EXISTS (SELECT 1 FROM public.simplebudget_materials_template_meta);

-- ============================================
-- 6. SimpleBudget Labor Template
-- ============================================
CREATE TABLE IF NOT EXISTS public.simplebudget_labor_template_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL DEFAULT 'Labor Template',
  description TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simplebudget_labor_template_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view labor template meta"
  ON public.simplebudget_labor_template_meta FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert labor template meta"
  ON public.simplebudget_labor_template_meta FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update labor template meta"
  ON public.simplebudget_labor_template_meta FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default record if not exists
INSERT INTO public.simplebudget_labor_template_meta (template_name, description)
SELECT 'Labor Template', 'Default template for labor items'
WHERE NOT EXISTS (SELECT 1 FROM public.simplebudget_labor_template_meta);

-- ============================================
-- 7. Create template_images storage bucket
-- ============================================
-- Create the storage bucket for template images
INSERT INTO storage.buckets (id, name, owner, public)
VALUES ('template-images', 'template-images', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
CREATE POLICY "Public read access for template images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

CREATE POLICY "Authenticated users can upload template images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'template-images');

CREATE POLICY "Users can delete their own template images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'template-images' AND owner = auth.uid());

COMMIT;
