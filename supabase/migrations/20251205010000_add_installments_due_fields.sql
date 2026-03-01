ALTER TABLE project_financial_entries ADD COLUMN IF NOT EXISTS days_before_due INTEGER;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS installments_due_days INTEGER DEFAULT 3;
