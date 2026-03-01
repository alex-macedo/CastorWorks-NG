-- ============================================================================
-- CastorWorks Architect Module - Seed Data
-- Created: 2025-11-19
-- Description: Demo data for testing the Architect module
-- ============================================================================

-- Note: This seed data is for development/demo purposes only
-- It assumes you have at least one client and one project in your database
-- Adjust the IDs as needed for your environment

-- Insert sample opportunities (if clients exist)
DO $$
DECLARE
  sample_client_id UUID;
  current_user_id UUID;
BEGIN
  -- Get a sample client (first one)
  SELECT id INTO sample_client_id FROM clients LIMIT 1;

  -- Get current user (for created_by)
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;

  -- Only insert if we have both a client and a user
  IF sample_client_id IS NOT NULL AND current_user_id IS NOT NULL THEN
    INSERT INTO architect_opportunities (client_id, project_name, estimated_value, probability, stage, expected_closing_date, notes, created_by)
    VALUES
      (sample_client_id, 'Residential House - Jardins', 450000, 75, 'negotiation', CURRENT_DATE + INTERVAL '30 days', 'Cliente interessado em casa moderna de 300m²', current_user_id),
      (sample_client_id, 'Commercial Office Renovation', 280000, 60, 'proposal_sent', CURRENT_DATE + INTERVAL '45 days', 'Renovação de escritório corporativo', current_user_id),
      (sample_client_id, 'Apartment Interior Design', 120000, 90, 'briefing', CURRENT_DATE + INTERVAL '15 days', 'Design de interiores para apartamento de 150m²', current_user_id),
      (sample_client_id, 'Corporate Headquarters', 1200000, 40, 'initial_contact', CURRENT_DATE + INTERVAL '90 days', 'Projeto de sede corporativa', current_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample briefing (if project exists)
DO $$
DECLARE
  sample_project_id UUID;
  current_user_id UUID;
BEGIN
  SELECT id INTO sample_project_id FROM projects LIMIT 1;
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;

  IF sample_project_id IS NOT NULL AND current_user_id IS NOT NULL THEN
    INSERT INTO architect_briefings (
      project_id,
      client_objectives,
      style_preferences,
      budget_range_min,
      budget_range_max,
      area_m2,
      must_haves,
      constraints,
      inspirations,
      notes,
      created_by
    )
    VALUES (
      sample_project_id,
      'Create a modern, sustainable family home that maximizes natural light and outdoor integration.',
      'Contemporary minimalist with natural materials (wood, stone, concrete). Clean lines, open spaces.',
      400000,
      550000,
      280,
      '- 3 bedrooms with ensuite bathrooms\n- Large open-plan kitchen/living area\n- Home office\n- Covered outdoor entertainment area\n- Sustainable features (solar panels, rainwater collection)',
      '- Steep sloping site\n- Heritage overlay restrictions\n- North-facing requirement for main living areas\n- Budget ceiling of $550k',
      '[
        {"type": "link", "url": "https://example.com/inspiration1", "description": "Modern Brazilian architecture"},
        {"type": "link", "url": "https://example.com/inspiration2", "description": "Sustainable design examples"}
      ]'::jsonb,
      'Client prefers to start construction in Q2 2026. Very focused on sustainability and energy efficiency.',
      current_user_id
    )
    ON CONFLICT (project_id) DO NOTHING;
  END IF;
END $$;

-- Insert sample tasks (if project exists)
DO $$
DECLARE
  sample_project_id UUID;
  current_user_id UUID;
  sample_phase_id UUID;
BEGIN
  SELECT id INTO sample_project_id FROM projects LIMIT 1;
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;
  SELECT id INTO sample_phase_id FROM project_phases WHERE project_id = sample_project_id LIMIT 1;

  IF sample_project_id IS NOT NULL AND current_user_id IS NOT NULL THEN
    INSERT INTO architect_tasks (project_id, phase_id, title, description, assignee_id, due_date, priority, status, tags, created_by)
    VALUES
      (sample_project_id, sample_phase_id, 'Complete site survey and measurements', 'Conduct detailed site survey including topography, existing vegetation, and utilities', current_user_id, CURRENT_DATE + INTERVAL '7 days', 'high', 'in_progress', '["survey", "site-analysis"]'::jsonb, current_user_id),
      (sample_project_id, sample_phase_id, 'Prepare concept sketches', 'Develop 3-4 concept design options based on briefing', current_user_id, CURRENT_DATE + INTERVAL '14 days', 'high', 'todo', '["design", "concept"]'::jsonb, current_user_id),
      (sample_project_id, sample_phase_id, 'Review planning regulations', 'Check local council planning requirements and restrictions', current_user_id, CURRENT_DATE + INTERVAL '5 days', 'urgent', 'completed', '["compliance", "planning"]'::jsonb, current_user_id),
      (sample_project_id, NULL, 'Schedule client presentation', 'Book meeting room and prepare presentation materials', current_user_id, CURRENT_DATE + INTERVAL '10 days', 'medium', 'todo', '["client", "meeting"]'::jsonb, current_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample meetings (if project and client exist)
DO $$
DECLARE
  sample_project_id UUID;
  sample_client_id UUID;
  current_user_id UUID;
BEGIN
  SELECT id INTO sample_project_id FROM projects LIMIT 1;
  SELECT id INTO sample_client_id FROM clients LIMIT 1;
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;

  IF sample_project_id IS NOT NULL AND sample_client_id IS NOT NULL AND current_user_id IS NOT NULL THEN
    INSERT INTO architect_meetings (project_id, client_id, meeting_date, participants, agenda, decisions, next_actions, created_by)
    VALUES
      (
        sample_project_id,
        sample_client_id,
        CURRENT_TIMESTAMP + INTERVAL '3 days',
        '[
          {"name": "João Silva", "role": "Client"},
          {"name": "Maria Santos", "role": "Lead Architect"},
          {"name": "Pedro Costa", "role": "Project Manager"}
        ]'::jsonb,
        '1. Review preliminary designs\n2. Discuss material selections\n3. Timeline and budget confirmation\n4. Next steps',
        NULL,
        NULL,
        current_user_id
      ),
      (
        sample_project_id,
        sample_client_id,
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        '[
          {"name": "João Silva", "role": "Client"},
          {"name": "Maria Santos", "role": "Lead Architect"}
        ]'::jsonb,
        'Initial briefing session',
        '- Confirmed budget range of $400k-$550k\n- Agreed on contemporary minimalist style\n- Client prioritizes sustainability\n- 3 bedrooms required',
        '- Maria to prepare 3 concept options\n- Schedule site visit for next week\n- Send client inspiration board examples',
        current_user_id
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample site diary entries (if project exists)
DO $$
DECLARE
  sample_project_id UUID;
  current_user_id UUID;
BEGIN
  SELECT id INTO sample_project_id FROM projects LIMIT 1;
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;

  IF sample_project_id IS NOT NULL AND current_user_id IS NOT NULL THEN
    INSERT INTO architect_site_diary (project_id, diary_date, weather, progress_summary, notes, photos, checklist_status, created_by)
    VALUES
      (
        sample_project_id,
        CURRENT_DATE - INTERVAL '2 days',
        'Sunny, 28°C',
        'Foundation excavation completed. Steel reinforcement for ground floor slab delivered and inspected.',
        'Concrete pour scheduled for tomorrow morning. All inspections passed.',
        '[]'::jsonb,
        '{"structure": true, "finishes": false, "installations": false}'::jsonb,
        current_user_id
      ),
      (
        sample_project_id,
        CURRENT_DATE - INTERVAL '5 days',
        'Partly cloudy, 24°C',
        'Site cleared and leveled. Temporary fencing installed. Utilities marked.',
        'Awaiting delivery of foundation materials.',
        '[]'::jsonb,
        '{"structure": false, "finishes": false, "installations": false}'::jsonb,
        current_user_id
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

-- Summary of inserted demo data:
COMMENT ON TABLE architect_opportunities IS 'Demo data: 4 opportunities across different stages';
COMMENT ON TABLE architect_briefings IS 'Demo data: 1 detailed project briefing';
COMMENT ON TABLE architect_tasks IS 'Demo data: 4 tasks with different priorities and statuses';
COMMENT ON TABLE architect_meetings IS 'Demo data: 2 meetings (1 upcoming, 1 past)';
COMMENT ON TABLE architect_site_diary IS 'Demo data: 2 site diary entries';
