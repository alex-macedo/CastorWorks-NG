-- Generate VAU data for all destinations (using RESIDENCIAL_UNIFAMILIAR as base)
-- Apply destination-specific adjustments based on equivalence factors
-- Reference: IN RFB 2021/2021

DO $$
DECLARE
    v_ref_month DATE := '2025-01-01';
BEGIN
    -- Ensure we have some base data to work with if it doesn't exist
    -- This is a simplified seed for the example
    INSERT INTO tax_vau_reference (ref_month, state_code, destination_code, vau_value, source_note)
    VALUES 
    (v_ref_month, 'SP', 'RESIDENCIAL_UNIFAMILIAR', 1520.00, 'Base SP'),
    (v_ref_month, 'RJ', 'RESIDENCIAL_UNIFAMILIAR', 1489.00, 'Base RJ'),
    (v_ref_month, 'MG', 'RESIDENCIAL_UNIFAMILIAR', 1380.00, 'Base MG'),
    (v_ref_month, 'RS', 'RESIDENCIAL_UNIFAMILIAR', 1449.25, 'Base RS'),
    (v_ref_month, 'PR', 'RESIDENCIAL_UNIFAMILIAR', 1410.00, 'Base PR'),
    (v_ref_month, 'SC', 'RESIDENCIAL_UNIFAMILIAR', 1445.00, 'Base SC'),
    (v_ref_month, 'DF', 'RESIDENCIAL_UNIFAMILIAR', 1500.00, 'Base DF')
    ON CONFLICT (ref_month, state_code, destination_code) DO NOTHING;

    -- Generate values for other destinations using equivalence factors
    INSERT INTO tax_vau_reference (ref_month, state_code, destination_code, vau_value, source_note)
    SELECT
      v.ref_month,
      v.state_code,
      d.destination_code,
      ROUND(v.vau_value * d.equivalence_factor, 2),
      'Calculated from RESIDENCIAL_UNIFAMILIAR base × equivalence factor'
    FROM tax_vau_reference v
    CROSS JOIN inss_destination_factors d
    WHERE v.destination_code = 'RESIDENCIAL_UNIFAMILIAR'
      AND v.ref_month = v_ref_month
      AND d.destination_code != 'RESIDENCIAL_UNIFAMILIAR'
    ON CONFLICT (ref_month, state_code, destination_code) DO NOTHING;
END $$;
