-- Backfill Phase-First Cost Control for ALL projects
-- Safe to re-run: it avoids duplicating budget lines once a project's active baseline has any lines.
--
-- What it does:
-- 1) Ensures each project has a baseline budget version.
-- 2) Seeds budget lines from legacy project_budget_items (phase_id + category -> cost_code).
-- 3) If a project has no budget items, creates 0-value lines for each phase x (LAB/MAT/EQT/SUB/FEE/OVH),
--    so the new UI renders consistently.
-- 4) Backfills cost_code_id on legacy project_budget_items (when NULL).
-- 5) Backfills cost_code_id and default phase_id on project_financial_entries (when NULL).
--
-- Assumptions:
-- - You already applied `20251213093000_phase_first_cost_control.sql`.
-- - `project_phases.phase_name` is standardized; we still pick a "general" phase fallback when phase_id is missing.
-- - This script should be executed with a role that can write these tables (e.g. service_role/admin).

DO $$
DECLARE
  project record;
  v_version_id uuid;
  v_default_phase_id uuid;

  v_lab uuid;
  v_mat uuid;
  v_eqt uuid;
  v_sub uuid;
  v_fee uuid;
  v_ovh uuid;

  v_has_lines boolean;
  v_inserted_lines bigint;
  v_created_zero_lines bigint;
  v_updated_budget_items bigint;
  v_updated_financial_entries bigint;

  v_projects_processed bigint := 0;
BEGIN
  SET LOCAL search_path = public;

  SELECT id INTO v_lab FROM public.cost_codes WHERE code = 'LAB';
  SELECT id INTO v_mat FROM public.cost_codes WHERE code = 'MAT';
  SELECT id INTO v_eqt FROM public.cost_codes WHERE code = 'EQT';
  SELECT id INTO v_sub FROM public.cost_codes WHERE code = 'SUB';
  SELECT id INTO v_fee FROM public.cost_codes WHERE code = 'FEE';
  SELECT id INTO v_ovh FROM public.cost_codes WHERE code = 'OVH';

  IF v_lab IS NULL OR v_mat IS NULL OR v_eqt IS NULL OR v_sub IS NULL OR v_fee IS NULL OR v_ovh IS NULL THEN
    RAISE EXCEPTION 'Missing required cost codes (expected LAB/MAT/EQT/SUB/FEE/OVH).';
  END IF;

  FOR project IN
    SELECT id FROM public.projects
  LOOP
    v_projects_processed := v_projects_processed + 1;

    -- Ensure a baseline version exists (one per project).
    SELECT id
    INTO v_version_id
    FROM public.project_budget_versions
    WHERE project_id = project.id
      AND status = 'baseline'
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_version_id IS NULL THEN
      INSERT INTO public.project_budget_versions (project_id, name, status)
      VALUES (project.id, 'Baseline v1', 'baseline')
      RETURNING id INTO v_version_id;
    END IF;

    -- Choose a default phase fallback when legacy rows don't have phase_id.
    SELECT pp.id
    INTO v_default_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = project.id
      AND (
        pp.phase_name ILIKE 'geral%'
        OR pp.phase_name ILIKE 'admin%'
        OR pp.phase_name ILIKE 'general%'
        OR pp.phase_name ILIKE 'overhead%'
      )
    ORDER BY pp.created_at
    LIMIT 1;

    IF v_default_phase_id IS NULL THEN
      SELECT pp.id
      INTO v_default_phase_id
      FROM public.project_phases pp
      WHERE pp.project_id = project.id
      ORDER BY pp.start_date NULLS LAST, pp.created_at
      LIMIT 1;
    END IF;

    -- No phases => cannot apply phase-first design; skip quietly.
    IF v_default_phase_id IS NULL THEN
      CONTINUE;
    END IF;

    -- If the baseline already has ANY lines, do not insert (prevents duplicates on re-run).
    SELECT EXISTS (
      SELECT 1
      FROM public.project_budget_lines bl
      WHERE bl.project_id = project.id
        AND bl.version_id = v_version_id
      LIMIT 1
    )
    INTO v_has_lines;

    v_inserted_lines := 0;
    v_created_zero_lines := 0;

    IF NOT v_has_lines THEN
      -- Insert from legacy project_budget_items.
      INSERT INTO public.project_budget_lines (
        project_id,
        version_id,
        phase_id,
        cost_code_id,
        description,
        amount
      )
      SELECT
        pbi.project_id,
        v_version_id,
        COALESCE(pbi.phase_id, v_default_phase_id),
        CASE
          WHEN lower(coalesce(pbi.category, '')) ~ '(mão|mao|labor|m\\.o\\b|m\\s*o\\b)' THEN v_lab
          WHEN lower(coalesce(pbi.category, '')) ~ '(material|materiais|insumo)' THEN v_mat
          WHEN lower(coalesce(pbi.category, '')) ~ '(equip|equipment|máquina|maquina|ferramenta)' THEN v_eqt
          WHEN lower(coalesce(pbi.category, '')) ~ '(sub|terceir|serviç|servic|contract)' THEN v_sub
          WHEN lower(coalesce(pbi.category, '')) ~ '(tax|fee|alvar|licen|permit|iss|inss)' THEN v_fee
          WHEN lower(coalesce(pbi.category, '')) ~ '(overhead|admin|geral|indireto)' THEN v_ovh
          ELSE v_mat
        END AS cost_code_id,
        NULLIF(trim(coalesce(pbi.description, pbi.category)), '') AS description,
        COALESCE(pbi.budgeted_amount, 0)::numeric AS amount
      FROM public.project_budget_items pbi
      WHERE pbi.project_id = project.id;

      GET DIAGNOSTICS v_inserted_lines = ROW_COUNT;

      -- If there were no legacy items, create 0-value lines for each phase x cost type.
      IF v_inserted_lines = 0 THEN
        INSERT INTO public.project_budget_lines (
          project_id,
          version_id,
          phase_id,
          cost_code_id,
          description,
          amount
        )
        SELECT
          project.id,
          v_version_id,
          pp.id,
          cc.id,
          cc.name,
          0::numeric
        FROM public.project_phases pp
        JOIN public.cost_codes cc ON cc.level = 1 AND cc.code IN ('LAB', 'MAT', 'EQT', 'SUB', 'FEE', 'OVH')
        WHERE pp.project_id = project.id;

        GET DIAGNOSTICS v_created_zero_lines = ROW_COUNT;
      END IF;
    END IF;

    -- Backfill legacy budget item cost_code_id (do not overwrite).
    UPDATE public.project_budget_items pbi
    SET cost_code_id = CASE
      WHEN lower(coalesce(pbi.category, '')) ~ '(mão|mao|labor|m\\.o\\b|m\\s*o\\b)' THEN v_lab
      WHEN lower(coalesce(pbi.category, '')) ~ '(material|materiais|insumo)' THEN v_mat
      WHEN lower(coalesce(pbi.category, '')) ~ '(equip|equipment|máquina|maquina|ferramenta)' THEN v_eqt
      WHEN lower(coalesce(pbi.category, '')) ~ '(sub|terceir|serviç|servic|contract)' THEN v_sub
      WHEN lower(coalesce(pbi.category, '')) ~ '(tax|fee|alvar|licen|permit|iss|inss)' THEN v_fee
      WHEN lower(coalesce(pbi.category, '')) ~ '(overhead|admin|geral|indireto)' THEN v_ovh
      ELSE v_mat
    END
    WHERE pbi.project_id = project.id
      AND pbi.cost_code_id IS NULL;

    GET DIAGNOSTICS v_updated_budget_items = ROW_COUNT;

    -- Backfill financial entry tags (do not overwrite existing tags).
    UPDATE public.project_financial_entries e
    SET
      cost_code_id = COALESCE(
        e.cost_code_id,
        CASE
          WHEN lower(coalesce(e.category, '')) ~ '(labor|mão|mao|m\\.o\\b|m\\s*o\\b)' THEN v_lab
          WHEN lower(coalesce(e.category, '')) ~ '(materials?|materiais?|insumo)' THEN v_mat
          WHEN lower(coalesce(e.category, '')) ~ '(equip|equipment|máquina|maquina)' THEN v_eqt
          WHEN lower(coalesce(e.category, '')) ~ '(services?|serviç|servic|sub|terceir|contract)' THEN v_sub
          WHEN lower(coalesce(e.category, '')) ~ '(tax|fee|alvar|licen|permit|iss|inss)' THEN v_fee
          WHEN lower(coalesce(e.category, '')) ~ '(overhead|admin|geral|other|outro|indireto)' THEN v_ovh
          ELSE NULL
        END
      ),
      phase_id = COALESCE(e.phase_id, v_default_phase_id)
    WHERE e.project_id = project.id
      AND (e.cost_code_id IS NULL OR e.phase_id IS NULL);

    GET DIAGNOSTICS v_updated_financial_entries = ROW_COUNT;

    IF v_inserted_lines > 0 OR v_created_zero_lines > 0 OR v_updated_budget_items > 0 OR v_updated_financial_entries > 0 THEN
      RAISE NOTICE
        'Project %: inserted_lines=%, zero_lines=%, updated_budget_items=%, updated_financial_entries=%',
        project.id, v_inserted_lines, v_created_zero_lines, v_updated_budget_items, v_updated_financial_entries;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done. Projects processed: %', v_projects_processed;
END
$$;

