-- ============================================================================
-- Update Phase 2 roadmap_items to done status
-- Sprint 2026-08
-- ============================================================================

BEGIN;

-- Check if sprint 2026-08 exists
DO $$
DECLARE
  v_sprint_id UUID;
  v_count INTEGER;
BEGIN
  -- Find sprint 2026-08
  SELECT id INTO v_sprint_id FROM sprints WHERE sprint_identifier = '2026-08' LIMIT 1;
  
  IF v_sprint_id IS NOT NULL THEN
    RAISE NOTICE 'Found Sprint 2026-08: %', v_sprint_id;
    
    -- Update Phase 2 tasks to done
    UPDATE roadmap_items 
    SET status = 'done', updated_at = NOW()
    WHERE sprint_id = v_sprint_id 
    AND (
      title ILIKE '%phase 2a%' 
      OR title ILIKE '%phase 2b%'
      OR title ILIKE '%phase 2c%'
      OR title ILIKE '%phase 2d%'
      OR title ILIKE '%phase 2e%'
      OR title ILIKE '%phase 2f%'
      OR title ILIKE '%phase 2g%'
      OR title ILIKE '%phase 2h%'
      OR title ILIKE '%phase 2i%'
      OR title ILIKE '%phase 2j%'
      OR title ILIKE '%cashflow%'
      OR title ILIKE '%collection%'
      OR title ILIKE '%reconciliation%'
      OR title ILIKE '%autonomous%'
      OR title ILIKE '%predictive%'
      OR title ILIKE '%multi-currency%'
      OR title ILIKE '%payment%'
      OR title ILIKE '%castormind%'
      OR title ILIKE '%open finance%'
      OR title ILIKE '%sefaz%'
      OR title ILIKE '%exchange rate%'
      OR title ILIKE '%fx%'
      OR title ILIKE '%installment%'
      OR title ILIKE '%payment link%'
    );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % roadmap_items to done status', v_count;
  ELSE
    RAISE NOTICE 'Sprint 2026-08 not found, skipping roadmap_items update';
  END IF;
END $$;

COMMIT;
