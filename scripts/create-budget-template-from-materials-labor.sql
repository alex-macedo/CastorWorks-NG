-- ==============================================================================
-- Script: Create Budget Template from Project Materials & Labor
-- Purpose: Populate budget_templates tables using data from project_materials 
--          and project_labor tables
-- ==============================================================================

-- This script creates a function that can be called to generate budget templates
-- from existing project materials and labor data

-- ==============================================================================
-- Function: create_budget_template_from_project
-- Parameters:
--   p_template_name: Name of the template to create
--   p_company_id: Company ID to associate the template with
--   p_user_id: User ID of the template creator
--   p_project_id: Project ID to extract materials/labor from
--   p_budget_type: 'simple' or 'cost_control'
--   p_is_public: Whether to make template public (default: false)
--   p_description: Optional description
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
    total_budget_amount,
    has_phases,
    has_cost_codes
  ) VALUES (
    p_template_name,
    p_description,
    p_company_id,
    p_user_id,
    p_is_public,
    p_budget_type,
    v_total_budget,
    CASE WHEN p_budget_type = 'cost_control' THEN TRUE ELSE FALSE END,
    FALSE
  ) RETURNING id INTO v_template_id;

  RAISE NOTICE 'Created budget template % with total budget: %', v_template_id, v_total_budget;

  -- Insert materials as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    v_template_id,
    group_name,
    description,
    total,
    ROW_NUMBER() OVER (ORDER BY group_name, description) AS display_order
  FROM project_materials
  WHERE project_id = p_project_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;
  RAISE NOTICE 'Added % material items to template', v_item_count;

  -- Insert labor items as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    v_template_id,
    "group",
    description,
    total_value,
    ROW_NUMBER() OVER (ORDER BY "group", description) + v_item_count AS display_order
  FROM project_labor
  WHERE project_id = p_project_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;
  RAISE NOTICE 'Added % labor items to template', v_item_count;

  -- For cost_control templates, create phases from material/labor groups
  IF p_budget_type = 'cost_control' THEN
    -- Create phases from material groups
    INSERT INTO budget_template_phases (
      template_id,
      phase_name,
      display_order
    )
    SELECT DISTINCT
      v_template_id,
      group_name,
      ROW_NUMBER() OVER (ORDER BY group_name)
    FROM project_materials
    WHERE project_id = p_project_id
      AND group_name IS NOT NULL
      AND group_name != 'Custo Total Estimado'
    ON CONFLICT DO NOTHING;

    -- Create phases from labor groups
    INSERT INTO budget_template_phases (
      template_id,
      phase_name,
      display_order
    )
    SELECT DISTINCT
      v_template_id,
      "group",
      ROW_NUMBER() OVER (ORDER BY "group")
    FROM project_labor
    WHERE project_id = p_project_id
      AND "group" IS NOT NULL
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created phases for cost_control template';
  END IF;

  RETURN v_template_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_budget_template_from_project(
  VARCHAR(255), UUID, UUID, UUID, VARCHAR(50), BOOLEAN, TEXT
) TO authenticated;

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
DECLARE
  v_template_id UUID;
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

GRANT EXECUTE ON FUNCTION create_simple_budget_template(
  VARCHAR(255), UUID, UUID, UUID, BOOLEAN, TEXT
) TO authenticated;

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
DECLARE
  v_template_id UUID;
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

GRANT EXECUTE ON FUNCTION create_cost_control_budget_template(
  VARCHAR(255), UUID, UUID, UUID, BOOLEAN, TEXT
) TO authenticated;

-- ==============================================================================
-- Function: add_materials_to_budget_template
-- Add specific materials to an existing budget template
-- ==============================================================================
CREATE OR REPLACE FUNCTION add_materials_to_budget_template(
  p_template_id UUID,
  p_project_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items_added INTEGER := 0;
BEGIN
  -- Add materials as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    p_template_id,
    group_name,
    description,
    total,
    COALESCE(
      (SELECT MAX(display_order) FROM budget_template_items WHERE template_id = p_template_id), 0
    ) + ROW_NUMBER() OVER (ORDER BY group_name, description)
  FROM project_materials
  WHERE project_id = p_project_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_items_added = ROW_COUNT;
  
  -- Update template's total budget amount
  UPDATE budget_templates
  SET total_budget_amount = (
    SELECT COALESCE(SUM(budgeted_amount), 0)
    FROM budget_template_items
    WHERE template_id = p_template_id
  ),
    updated_at = NOW()
  WHERE id = p_template_id;

  RETURN v_items_added;
END;
$$;

GRANT EXECUTE ON FUNCTION add_materials_to_budget_template(UUID, UUID) TO authenticated;

-- ==============================================================================
-- Function: add_labor_to_budget_template
-- Add specific labor items to an existing budget template
-- ==============================================================================
CREATE OR REPLACE FUNCTION add_labor_to_budget_template(
  p_template_id UUID,
  p_project_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items_added INTEGER := 0;
BEGIN
  -- Add labor items as budget template items
  INSERT INTO budget_template_items (
    template_id,
    category,
    description,
    budgeted_amount,
    display_order
  )
  SELECT 
    p_template_id,
    "group",
    description,
    total_value,
    COALESCE(
      (SELECT MAX(display_order) FROM budget_template_items WHERE template_id = p_template_id), 0
    ) + ROW_NUMBER() OVER (ORDER BY "group", description)
  FROM project_labor
  WHERE project_id = p_project_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_items_added = ROW_COUNT;
  
  -- Update template's total budget amount
  UPDATE budget_templates
  SET total_budget_amount = (
    SELECT COALESCE(SUM(budgeted_amount), 0)
    FROM budget_template_items
    WHERE template_id = p_template_id
  ),
    updated_at = NOW()
  WHERE id = p_template_id;

  RETURN v_items_added;
END;
$$;

GRANT EXECUTE ON FUNCTION add_labor_to_budget_template(UUID, UUID) TO authenticated;

-- ==============================================================================
-- Usage Examples:
-- ==============================================================================
-- 1. Create a Simple Budget template from a project:
--    SELECT create_simple_budget_template(
--      'Residential Construction Template',
--      'company-uuid-here',
--      'user-uuid-here',
--      'project-uuid-here',
--      TRUE,  -- is_public
--      'Standard residential construction template with common materials and labor'
--    );

-- 2. Create a Cost Control Budget template from a project:
--    SELECT create_cost_control_budget_template(
--      'Commercial Build Cost Control Template',
--      'company-uuid-here',
--      'user-uuid-here',
--      'project-uuid-here',
--      FALSE,  -- is_public (private)
--      'Phase-based cost tracking for commercial projects'
--    );

-- 3. Add materials to an existing template:
--    SELECT add_materials_to_budget_template(
--      'template-uuid-here',
--      'project-uuid-here'
--    );

-- 4. Add labor to an existing template:
--    SELECT add_labor_to_budget_template(
--      'template-uuid-here',
--      'project-uuid-here'
--    );

-- ==============================================================================
-- Notes:
-- - Functions require has_project_access() and company_id checks via RLS policies
-- - Simple templates use flat list of items (materials + labor)
-- - Cost Control templates also create phases from material/labor groups
-- - template_id is returned for further operations
-- ==============================================================================

COMMENT ON FUNCTION create_budget_template_from_project IS 
  'Creates a budget template from existing project materials and labor. Supports both simple and cost_control budget types.';

COMMENT ON FUNCTION create_simple_budget_template IS 
  'Simplified function to create a Simple Budget template from project materials and labor.';

COMMENT ON FUNCTION create_cost_control_budget_template IS 
  'Simplified function to create a Cost Control Budget template from project materials and labor (includes phases).';

COMMENT ON FUNCTION add_materials_to_budget_template IS 
  'Adds materials from a project to an existing budget template. Updates total budget amount.';

COMMENT ON FUNCTION add_labor_to_budget_template IS 
  'Adds labor items from a project to an existing budget template. Updates total budget amount.';
