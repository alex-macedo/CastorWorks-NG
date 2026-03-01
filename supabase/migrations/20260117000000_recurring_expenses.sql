-- Create recurring expense patterns table
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

CREATE TABLE IF NOT EXISTS public.recurring_expense_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    frequency recurrence_frequency NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    wbs_node_id UUID REFERENCES public.project_wbs_items(id) ON DELETE SET NULL,
    last_processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add reference to project_financial_entries
ALTER TABLE public.project_financial_entries 
ADD COLUMN IF NOT EXISTS recurring_pattern_id UUID REFERENCES public.recurring_expense_patterns(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.recurring_expense_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for recurring_expense_patterns
CREATE POLICY "Users can view recurring patterns for their projects"
    ON public.recurring_expense_patterns
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.project_team_members
        WHERE project_id = recurring_expense_patterns.project_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can manage recurring patterns for their projects"
    ON public.recurring_expense_patterns
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.project_team_members
        WHERE project_id = recurring_expense_patterns.project_id
        AND user_id = auth.uid()
    ));

-- Grant access
GRANT ALL ON public.recurring_expense_patterns TO authenticated;
GRANT ALL ON public.recurring_expense_patterns TO service_role;
