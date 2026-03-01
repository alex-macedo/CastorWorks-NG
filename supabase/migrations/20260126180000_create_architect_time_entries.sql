-- Create architect_time_entries table for project/task time tracking
CREATE TABLE IF NOT EXISTS architect_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES architect_tasks(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT true,
  hourly_rate NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE architect_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users see own entries; project members see project entries
CREATE POLICY "Users can view own time entries"
  ON architect_time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Project members can view project time entries"
  ON architect_time_entries FOR SELECT
  USING (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert own time entries"
  ON architect_time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON architect_time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON architect_time_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all time entries"
  ON architect_time_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for common queries
CREATE INDEX idx_time_entries_user ON architect_time_entries(user_id);
CREATE INDEX idx_time_entries_project ON architect_time_entries(project_id);
CREATE INDEX idx_time_entries_task ON architect_time_entries(task_id);
CREATE INDEX idx_time_entries_start ON architect_time_entries(start_time DESC);
CREATE INDEX idx_time_entries_user_date ON architect_time_entries(user_id, start_time DESC);
