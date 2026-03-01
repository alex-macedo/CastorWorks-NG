-- Migration: Create simplebudget template tables
-- Purpose: Create dedicated tables for simple budget templates (materials and labor)
-- This replaces the all-zeros UUID pattern in project_materials and project_labor

BEGIN;

-- Create simplebudget_materials_template table (all columns from project_materials EXCEPT project_id)
CREATE TABLE public.simplebudget_materials_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sinapi_code TEXT,
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  freight_percentage NUMERIC DEFAULT 0,
  factor NUMERIC DEFAULT 0,
  tgfa_applicable BOOLEAN DEFAULT false,
  fee_desc TEXT,
  editable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create simplebudget_labor_template table (all columns from project_labor EXCEPT project_id)
CREATE TABLE public.simplebudget_labor_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "group" TEXT NOT NULL,
  description TEXT NOT NULL,
  total_value NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.simplebudget_materials_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simplebudget_labor_template ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All users can SELECT, only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Authenticated users can view materials templates"
  ON public.simplebudget_materials_template FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert materials templates"
  ON public.simplebudget_materials_template FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update materials templates"
  ON public.simplebudget_materials_template FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete materials templates"
  ON public.simplebudget_materials_template FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Same policies for labor templates
CREATE POLICY "Authenticated users can view labor templates"
  ON public.simplebudget_labor_template FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert labor templates"
  ON public.simplebudget_labor_template FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update labor templates"
  ON public.simplebudget_labor_template FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete labor templates"
  ON public.simplebudget_labor_template FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_simplebudget_materials_template_group_name 
  ON public.simplebudget_materials_template(group_name);
CREATE INDEX idx_simplebudget_labor_template_group 
  ON public.simplebudget_labor_template("group");

-- Add updated_at trigger
CREATE TRIGGER update_simplebudget_materials_template_updated_at
  BEFORE UPDATE ON public.simplebudget_materials_template
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_simplebudget_labor_template_updated_at
  BEFORE UPDATE ON public.simplebudget_labor_template
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
