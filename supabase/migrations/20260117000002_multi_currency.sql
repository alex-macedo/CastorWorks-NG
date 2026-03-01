-- Migration to add Multi-Currency support columns
ALTER TABLE public.project_financial_entries 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6) DEFAULT 1;

-- Initialize existing records to use BRL as the original currency
UPDATE public.project_financial_entries 
SET original_amount = amount,
    original_currency = 'BRL',
    exchange_rate = 1
WHERE original_amount IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.project_financial_entries.original_amount IS 'The amount in the original currency (e.g. 100.00 USD)';
COMMENT ON COLUMN public.project_financial_entries.original_currency IS 'The ISO currency code (e.g. USD, EUR)';
COMMENT ON COLUMN public.project_financial_entries.exchange_rate IS 'The conversion rate to BRL at the time of entry';
