-- Migration: Update project task status creation to use global config
-- Date: 2026-02-01
-- Description: Modifies the project creation trigger to copy statuses from global dropdown_options instead of using hardcoded values

BEGIN;

-- Create new function to copy statuses from global config
CREATE OR REPLACE FUNCTION create_task_statuses_from_global_config(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  status_record RECORD;
  default_status_value TEXT;
BEGIN
  -- Get the default status value from global config
  SELECT value INTO default_status_value
  FROM dropdown_options 
  WHERE category = 'task_status' AND is_default = true AND is_active = true
  LIMIT 1;
  
  -- If no default found, use 'not_started'
  IF default_status_value IS NULL THEN
    default_status_value := 'not_started';
  END IF;

  -- Copy each active global status to the project
  FOR status_record IN 
    SELECT value, label, color, icon, sort_order, is_default
    FROM dropdown_options 
    WHERE category = 'task_status' AND is_active = true
    ORDER BY sort_order
  LOOP
    INSERT INTO project_task_statuses (
      project_id, 
      name, 
      slug, 
      color, 
      icon, 
      sort_order, 
      is_default, 
      is_completed, 
      is_system,
      is_visible,
      created_at,
      updated_at
    ) VALUES (
      p_project_id,
      status_record.label,
      status_record.value,
      status_record.color,
      status_record.icon,
      status_record.sort_order,
      (status_record.value = default_status_value),
      (status_record.value = 'completed'),
      true,  -- System status (from global config)
      true,  -- Visible by default
      NOW(),
      NOW()
    )
    ON CONFLICT (project_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      is_default = EXCLUDED.is_default,
      is_completed = EXCLUDED.is_completed,
      is_system = true,
      is_visible = COALESCE(project_task_statuses.is_visible, true),  -- Preserve visibility if already set
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update trigger function to use new method
CREATE OR REPLACE FUNCTION trigger_create_default_task_statuses()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_task_statuses_from_global_config(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
