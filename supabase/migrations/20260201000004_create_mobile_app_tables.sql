-- Mobile App Infrastructure Tables
-- Creates tables for annotations, expenses, messages, meetings, and daily logs

-- 1. Floor Plan Annotations table
CREATE TABLE IF NOT EXISTS public.floor_plan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_plan_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location_x FLOAT,
  location_y FLOAT,
  photo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_annotations_project_id ON public.floor_plan_annotations(project_id);
CREATE INDEX idx_annotations_assignee_id ON public.floor_plan_annotations(assignee_id);
CREATE INDEX idx_annotations_status ON public.floor_plan_annotations(status);

-- 2. Project Expenses table
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(100) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX idx_expenses_recorded_date ON public.project_expenses(recorded_date);
CREATE INDEX idx_expenses_category ON public.project_expenses(category);

-- 3. Project Messages table (for real-time chat)
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_messages_created_at ON public.project_messages(created_at);

-- 4. Meeting Recordings table
CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  agenda_items JSONB DEFAULT '[]',
  notes TEXT,
  audio_url TEXT,
  audio_processed BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meetings_project_id ON public.meeting_recordings(project_id);
CREATE INDEX idx_meetings_started_at ON public.meeting_recordings(started_at);

-- 5. Project Emails table (for email tracking)
CREATE TABLE IF NOT EXISTS public.project_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emails_project_id ON public.project_emails(project_id);
CREATE INDEX idx_emails_status ON public.project_emails(status);

-- 6. Moodboard Images table
CREATE TABLE IF NOT EXISTS public.moodboard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt TEXT,
  style_tags TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moodboard_project_id ON public.moodboard_images(project_id);
CREATE INDEX idx_moodboard_status ON public.moodboard_images(status);

-- Enable RLS on all new tables
ALTER TABLE public.floor_plan_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodboard_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Annotations
CREATE POLICY "Users can view project annotations"
  ON public.floor_plan_annotations FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create annotations in their projects"
  ON public.floor_plan_annotations FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update their annotations"
  ON public.floor_plan_annotations FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- RLS Policies: Expenses
CREATE POLICY "Users can view project expenses"
  ON public.project_expenses FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can record expenses in their projects"
  ON public.project_expenses FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- RLS Policies: Messages
CREATE POLICY "Users can view project messages"
  ON public.project_messages FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can send messages to projects"
  ON public.project_messages FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) AND user_id = auth.uid());

-- RLS Policies: Meeting Recordings
CREATE POLICY "Users can view project meetings"
  ON public.meeting_recordings FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can record meetings in their projects"
  ON public.meeting_recordings FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- RLS Policies: Project Emails
CREATE POLICY "Users can view project emails"
  ON public.project_emails FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can send project emails"
  ON public.project_emails FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- RLS Policies: Moodboard Images
CREATE POLICY "Users can view project moodboard"
  ON public.moodboard_images FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can add to project moodboard"
  ON public.moodboard_images FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

COMMIT;
