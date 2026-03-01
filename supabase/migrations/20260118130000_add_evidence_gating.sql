-- CastorWorks INSS Obra Module - Evidence Gating
-- Ensures required evidence is uploaded before advancing to SERO submission

BEGIN;

-- Function to check if required documents exist for applied strategies
CREATE OR REPLACE FUNCTION check_tax_project_evidence(p_tax_project_id UUID)
RETURNS TABLE(valid BOOLEAN, missing_docs TEXT[]) AS $$
DECLARE
    v_owner_type tax_owner_type;
    v_category tax_work_category;
    v_construction_type tax_construction_type;
    v_has_pre_moldados BOOLEAN;
    v_is_decadencia BOOLEAN;
    v_actual_end_date DATE;
    v_missing_docs TEXT[] := '{}';
    v_doc_count INTEGER;
BEGIN
    -- Get project details
    SELECT owner_type, category, construction_type, actual_end_date
    INTO v_owner_type, v_category, v_construction_type, v_actual_end_date
    FROM tax_projects
    WHERE id = p_tax_project_id;

    -- Check for Pre-moldados evidence
    IF v_construction_type = 'PRE_MOLDADO' THEN
        SELECT COUNT(*) INTO v_doc_count 
        FROM tax_documents 
        WHERE tax_project_id = p_tax_project_id AND document_type = 'NF_PRE_MOLDADO';
        
        IF v_doc_count = 0 THEN
            v_missing_docs := array_append(v_missing_docs, 'Nota Fiscal de Pré-moldado');
        END IF;
    END IF;

    -- Check for Fator Social evidence (Residential PF)
    IF v_owner_type = 'PF' AND v_category = 'OBRA_NOVA' THEN
        SELECT COUNT(*) INTO v_doc_count 
        FROM tax_documents 
        WHERE tax_project_id = p_tax_project_id AND document_type = 'HABITE_SE';
        
        IF v_doc_count = 0 THEN
            v_missing_docs := array_append(v_missing_docs, 'Habite-se / Alvará de Conservação');
        END IF;
    END IF;

    -- Check for Decadência evidence (>5 years)
    IF v_actual_end_date IS NOT NULL AND v_actual_end_date < (CURRENT_DATE - INTERVAL '5 years') THEN
        SELECT COUNT(*) INTO v_doc_count 
        FROM tax_documents 
        WHERE tax_project_id = p_tax_project_id AND document_type IN ('HABITE_SE', 'COMPROVANTE_PAGAMENTO', 'OUTROS'); -- Proof of date
        
        IF v_doc_count = 0 THEN
            v_missing_docs := array_append(v_missing_docs, 'Prova de conclusão da obra (Habite-se, conta de luz antiga, etc)');
        END IF;
    END IF;

    RETURN QUERY SELECT array_length(v_missing_docs, 1) IS NULL OR array_length(v_missing_docs, 1) = 0, v_missing_docs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent advancing to SERO_DONE if evidence is missing
CREATE OR REPLACE FUNCTION trg_fn_validate_sero_readiness()
RETURNS TRIGGER AS $$
DECLARE
    v_valid BOOLEAN;
    v_missing TEXT[];
BEGIN
    -- Only check when trying to move to SERO_DONE or beyond
    IF NEW.status IN ('SERO_DONE', 'LIABILITY_OPEN', 'PAID', 'CLOSED') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('SERO_DONE', 'LIABILITY_OPEN', 'PAID', 'CLOSED')) THEN
        
        SELECT valid, missing_docs INTO v_valid, v_missing FROM check_tax_project_evidence(NEW.id);
        
        IF NOT v_valid THEN
            RAISE EXCEPTION 'CW_INSS_004: Missing required evidence for status transition. Missing: %', array_to_string(v_missing, ', ');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_tax_sero_readiness ON tax_projects;
CREATE TRIGGER trg_validate_tax_sero_readiness
    BEFORE UPDATE ON tax_projects
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_validate_sero_readiness();

COMMIT;
