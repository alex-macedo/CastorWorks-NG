-- Migration: Migrate existing projects to use global task status configuration
-- Date: 2026-02-01
-- Description: Updates all existing projects to have task statuses that match the global configuration

BEGIN;

-- Migrate all existing projects to use global task status configuration
DO $$
DECLARE
  project_record RECORD;
  status_count INTEGER;
BEGIN
  FOR project_record IN 
    SELECT id FROM projects ORDER BY created_at
  LOOP
    -- Check if project already has any task statuses
    SELECT COUNT(*) INTO status_count
    FROM project_task_statuses 
    WHERE project_id = project_record.id;
    
    IF status_count = 0 THEN
      -- Project has no statuses, create them from global config
      PERFORM create_task_statuses_from_global_config(project_record.id);
    ELSE
      -- Project has existing statuses, update system ones to match global config
      -- and add any missing global statuses
      
      -- Update existing system statuses to match global config (except sort_order)
      UPDATE project_task_statuses pts
      SET 
        name = gdo.label,
        color = gdo.color,
        icon = gdo.icon,
        is_system = true,
        updated_at = NOW()
      FROM dropdown_options gdo
      WHERE pts.project_id = project_record.id
        AND pts.slug = gdo.value
        AND gdo.category = 'task_status'
        AND pts.is_system = true;
      
      -- Insert any missing global statuses for this project
      -- Use a high sort_order (100+) to avoid conflicts with existing statuses
      INSERT INTO project_task_statuses (
        project_id, name, slug, color, icon, sort_order, 
        is_default, is_completed, is_system, is_visible
      )
      SELECT 
        project_record.id,
        gdo.label,
        gdo.value,
        gdo.color,
        gdo.icon,
        100 + gdo.sort_order,  -- Use high sort_order to avoid conflicts
        gdo.is_default,
        (gdo.value = 'completed'),
        true,
        true
      FROM dropdown_options gdo
      WHERE gdo.category = 'task_status'
        AND gdo.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM project_task_statuses pts 
          WHERE pts.project_id = project_record.id 
          AND pts.slug = gdo.value
        );
    END IF;
  END LOOP;
END $$;

COMMIT;
