-- ============================================================================
-- Migration: Add Planned Scenario Fields to tax_estimates
-- ============================================================================
-- Purpose: Store monthlyPayment, totalINSS, and constructionMonths to prevent
--          regressions where monthly payment shows incorrectly
-- ============================================================================

-- Add columns for planned scenario data
ALTER TABLE tax_estimates
  ADD COLUMN IF NOT EXISTS construction_months INTEGER,
  ADD COLUMN IF NOT EXISTS planned_total_inss NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS planned_monthly_payment NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS planned_total_savings NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS planned_savings_percentage NUMERIC(6, 4);

-- Add comments for documentation
COMMENT ON COLUMN tax_estimates.construction_months IS 'Number of construction months used in the calculation (prevents regression)';
COMMENT ON COLUMN tax_estimates.planned_total_inss IS 'Total optimized INSS for planned scenario';
COMMENT ON COLUMN tax_estimates.planned_monthly_payment IS 'Monthly payment amount (totalINSS / constructionMonths) - prevents regression';
COMMENT ON COLUMN tax_estimates.planned_total_savings IS 'Total savings in planned scenario';
COMMENT ON COLUMN tax_estimates.planned_savings_percentage IS 'Savings percentage in planned scenario';

-- Add constraint to ensure construction_months is positive
-- Use DO block to check if constraint exists first (PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ck_tax_estimates_construction_months'
  ) THEN
    ALTER TABLE tax_estimates
      ADD CONSTRAINT ck_tax_estimates_construction_months 
      CHECK (construction_months IS NULL OR construction_months > 0);
  END IF;
END $$;

-- Add constraint to ensure planned_monthly_payment matches formula when both values exist
-- Note: Using a function-based check would be ideal, but PostgreSQL doesn't support
-- computed constraints easily. We'll rely on application logic and tests.

-- Create index for queries filtering by construction_months
CREATE INDEX IF NOT EXISTS idx_tax_estimates_construction_months 
  ON tax_estimates(construction_months) 
  WHERE construction_months IS NOT NULL;
