-- Migration to add Brazilian Tax Engine columns
ALTER TABLE public.project_financial_entries 
ADD COLUMN IF NOT EXISTS is_service_entry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iss_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS inss_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pis_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS csll_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iss_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS inss_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pis_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS csll_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tax_withholding NUMERIC(15,2) DEFAULT 0;

-- Update existing records to set gross_amount equal to amount for consistency
UPDATE public.project_financial_entries 
SET gross_amount = amount 
WHERE gross_amount = 0 AND amount > 0;

-- Add a comment to the table
COMMENT ON COLUMN public.project_financial_entries.total_tax_withholding IS 'Sum of all withheld taxes (ISS + INSS + PIS + COFINS + CSLL)';
