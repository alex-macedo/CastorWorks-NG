-- Create functions for importing budget templates from project materials and labor
-- Migration: 20251225000001_create_budget_template_import_functions.sql
-- Purpose: Enable importing budget templates from existing project data

BEGIN;

-- ==============================================================================
-- Function: create_budget_template_from_project
-- Main function that creates a budget template from project materials and labor
-- ==============================================================================
CREATE OR REPLACE FUNCTION create_budget_template_from_project(
  p_template_name VARCHAR(255),
  p_company_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_budget_type VARCHAR(50) DEFAULT 'simple',
  p_is_public BOOLEAN DEFAULT FALSE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
  v_total_budget NUMERIC := 0;
  v_item_count INTEGER := 0;
BEGIN
  -- Calculate total budget from materials
  SELECT COALESCE(SUM(total), 0) INTO v_total_budget
  FROM project_materials
  WHERE project_id = p_project_id;

  -- Add labor costs
  v_total_budget := v_total_budget + COALESCE(
    (SELECT SUM(total_value) FROM project_labor WHERE project_id = p_project_id), 0
  );

  -- Create the budget template
  INSERT INTO budget_templates (
    name,
    description,
    company_id,
    created_by,
    is_public,
    budget_type,
    total_budget_amount
  ) VALUES (
    p_template_name,
    p_description,
    p_company_id,
    p_user_id,
    p_is_public,
    p_budget_type,
    v_total_budget
  ) RETURNING id INTO v_template_id;

  -- Add materials as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    v_template_id,
    COALESCE(group_name, 'Materials'),
    COALESCE(description, 'Material item'),
    COALESCE(total, 0),
    ROW_NUMBER() OVER (ORDER BY group_name, description)
  FROM project_materials
  WHERE project_id = p_project_id
    AND total > 0;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;

  -- Add labor items as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    v_template_id,
    'Labor',
    COALESCE(description, 'Labor item'),
    COALESCE(total_value, 0),
    v_item_count + ROW_NUMBER() OVER (ORDER BY description)
  FROM project_labor
  WHERE project_id = p_project_id
    AND total_value > 0;

  RETURN v_template_id;
END;
$$;

-- ==============================================================================
-- Function: create_simple_budget_template
-- Simplified version for Simple Budget templates (no phases)
-- ==============================================================================
CREATE OR REPLACE FUNCTION create_simple_budget_template(
  p_template_name VARCHAR(255),
  p_company_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_is_public BOOLEAN DEFAULT FALSE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN create_budget_template_from_project(
    p_template_name,
    p_company_id,
    p_user_id,
    p_project_id,
    'simple',
    p_is_public,
    p_description
  );
END;
$$;

-- ==============================================================================
-- Function: create_cost_control_budget_template
-- Simplified version for Cost Control Budget templates (includes phases)
-- ==============================================================================
CREATE OR REPLACE FUNCTION create_cost_control_budget_template(
  p_template_name VARCHAR(255),
  p_company_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_is_public BOOLEAN DEFAULT FALSE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN create_budget_template_from_project(
    p_template_name,
    p_company_id,
    p_user_id,
    p_project_id,
    'cost_control',
    p_is_public,
    p_description
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_budget_template_from_project(
  VARCHAR(255), UUID, UUID, UUID, VARCHAR(50), BOOLEAN, TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION create_simple_budget_template(
  VARCHAR(255), UUID, UUID, UUID, BOOLEAN, TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION create_cost_control_budget_template(
  VARCHAR(255), UUID, UUID, UUID, BOOLEAN, TEXT
) TO authenticated;

COMMIT;

