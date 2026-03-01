-- Fix close_sprint function to properly cast enum to text
CREATE OR REPLACE FUNCTION public.close_sprint(p_sprint_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sprint RECORD;
  v_release_notes TEXT;
  v_item RECORD;
  v_completed_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT * INTO v_sprint FROM sprints WHERE id = p_sprint_id;
  
  IF v_sprint.status = 'closed' THEN
    RAISE EXCEPTION 'Sprint is already closed';
  END IF;
  
  SELECT COUNT(*) INTO v_total_count
  FROM roadmap_items WHERE sprint_id = p_sprint_id;
  
  SELECT COUNT(*) INTO v_completed_count
  FROM roadmap_items 
  WHERE sprint_id = p_sprint_id AND status = 'done';
  
  v_release_notes := '# Sprint ' || v_sprint.sprint_identifier || ' - ' || v_sprint.title || E'\n\n';
  v_release_notes := v_release_notes || '**Sprint Period:** ' || 
    TO_CHAR(v_sprint.start_date, 'Mon DD, YYYY') || ' - ' || 
    TO_CHAR(v_sprint.end_date, 'Mon DD, YYYY') || E'\n\n';
  v_release_notes := v_release_notes || '**Completion Rate:** ' || 
    v_completed_count || '/' || v_total_count || 
    ' (' || ROUND((v_completed_count::NUMERIC / NULLIF(v_total_count, 0) * 100), 1) || '%)' || E'\n\n';
  
  v_release_notes := v_release_notes || E'## Completed Items\n\n';
  
  FOR v_item IN 
    SELECT * FROM roadmap_items 
    WHERE sprint_id = p_sprint_id AND status = 'done'
    ORDER BY category, priority DESC
  LOOP
    INSERT INTO sprint_items_snapshot (
      sprint_id, roadmap_item_id, item_title, item_description,
      item_status, item_category, item_priority, completed_at, estimated_effort
    ) VALUES (
      p_sprint_id, v_item.id, v_item.title, v_item.description,
      v_item.status, v_item.category::TEXT, v_item.priority::TEXT, 
      v_item.completed_at, v_item.estimated_effort
    );
    
    v_release_notes := v_release_notes || '### ' || v_item.title || E'\n';
    IF v_item.description IS NOT NULL THEN
      v_release_notes := v_release_notes || v_item.description || E'\n';
    END IF;
    v_release_notes := v_release_notes || '- **Category:** ' || v_item.category::TEXT || E'\n';
    v_release_notes := v_release_notes || '- **Priority:** ' || v_item.priority::TEXT || E'\n';
    v_release_notes := v_release_notes || '- **Completed:** ' || 
      TO_CHAR(v_item.completed_at, 'Mon DD, YYYY HH24:MI') || E'\n\n';
  END LOOP;
  
  IF v_total_count > v_completed_count THEN
    v_release_notes := v_release_notes || E'## Incomplete Items\n\n';
    FOR v_item IN 
      SELECT * FROM roadmap_items 
      WHERE sprint_id = p_sprint_id AND status != 'done'
      ORDER BY priority DESC
    LOOP
      INSERT INTO sprint_items_snapshot (
        sprint_id, roadmap_item_id, item_title, item_description,
        item_status, item_category, item_priority, completed_at, estimated_effort
      ) VALUES (
        p_sprint_id, v_item.id, v_item.title, v_item.description,
        v_item.status, v_item.category::TEXT, v_item.priority::TEXT, 
        v_item.completed_at, v_item.estimated_effort
      );
      
      v_release_notes := v_release_notes || '- ' || v_item.title || 
        ' (' || v_item.status || ')' || E'\n';
    END LOOP;
  END IF;
  
  UPDATE sprints SET
    status = 'closed',
    closed_at = NOW(),
    closed_by = auth.uid(),
    release_notes = v_release_notes,
    total_items = v_total_count,
    completed_items = v_completed_count,
    updated_at = NOW()
  WHERE id = p_sprint_id;
  
  RETURN json_build_object(
    'success', true,
    'sprint_id', p_sprint_id,
    'total_items', v_total_count,
    'completed_items', v_completed_count,
    'release_notes_preview', LEFT(v_release_notes, 500)
  );
END;
$function$;
