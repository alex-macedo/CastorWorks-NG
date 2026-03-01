-- WhatsApp Evolution API Integration - Corrected Migration
-- Sprint: 2026-05
-- Created: 2026-02-08
-- 
-- This migration adds Evolution API support alongside existing WhatsApp Cloud API tables
--
-- Apply with:
--   scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260208_whatsapp_evolution_api_v2.sql castorworks:/tmp/
--   ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260208_whatsapp_evolution_api_v2.sql"

BEGIN;

-- ============================================================
-- PART 1: EVOLUTION API SPECIFIC TABLES
-- Using 'evolution_' prefix to avoid conflicts with Cloud API tables
-- ============================================================

-- Evolution API Instances Table
CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(50) DEFAULT 'disconnected' 
    CHECK (status IN ('disconnected', 'connecting', 'awaiting_scan', 'connected', 'error')),
  qr_code TEXT,
  is_primary BOOLEAN DEFAULT false,
  api_key_hash VARCHAR(255),
  connected_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_instances_status ON public.evolution_instances(status);
CREATE INDEX IF NOT EXISTS idx_evolution_instances_primary ON public.evolution_instances(is_primary);

-- Evolution API Messages Table
CREATE TABLE IF NOT EXISTS public.evolution_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.evolution_instances(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  remote_jid VARCHAR(50) NOT NULL,
  from_me BOOLEAN DEFAULT false,
  message_id VARCHAR(100),
  push_name VARCHAR(255),
  message_type VARCHAR(50) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'poll', 'reaction', 'unknown')),
  content TEXT,
  media_url TEXT,
  media_mimetype VARCHAR(100),
  quoted_message_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'received'
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evolution_messages_project ON public.evolution_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_remote_jid ON public.evolution_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_received ON public.evolution_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_instance ON public.evolution_messages(instance_id);

-- Evolution API Message Templates Table
CREATE TABLE IF NOT EXISTS public.evolution_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  language VARCHAR(10) DEFAULT 'pt-BR',
  category VARCHAR(50) DEFAULT 'notification'
    CHECK (category IN ('notification', 'approval', 'reminder', 'report', 'marketing', 'alert')),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_templates_key ON public.evolution_message_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_evolution_templates_category ON public.evolution_message_templates(category);
CREATE INDEX IF NOT EXISTS idx_evolution_templates_active ON public.evolution_message_templates(is_active);

-- Evolution API Contacts Table
CREATE TABLE IF NOT EXISTS public.evolution_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contact_name VARCHAR(255),
  contact_type VARCHAR(50) DEFAULT 'client'
    CHECK (contact_type IN ('client', 'team_member', 'supplier', 'architect', 'contractor', 'other')),
  whatsapp_name VARCHAR(255),
  profile_picture_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  opted_in BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, project_id)
);

CREATE INDEX IF NOT EXISTS idx_evolution_contacts_user ON public.evolution_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_project ON public.evolution_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_phone ON public.evolution_contacts(phone_number);

-- Evolution API Approval Requests Table
CREATE TABLE IF NOT EXISTS public.evolution_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  approval_type VARCHAR(50) NOT NULL
    CHECK (approval_type IN ('purchase_order', 'change_order', 'invoice', 'milestone', 'document', 'budget', 'schedule')),
  reference_id UUID NOT NULL,
  reference_table VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  approval_code VARCHAR(20),
  message_sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_approvals_phone ON public.evolution_approval_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_evolution_approvals_status ON public.evolution_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_evolution_approvals_project ON public.evolution_approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_approvals_code ON public.evolution_approval_requests(approval_code);

-- Evolution API Groups Table
CREATE TABLE IF NOT EXISTS public.evolution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.evolution_instances(id) ON DELETE SET NULL,
  group_jid VARCHAR(100) UNIQUE NOT NULL,
  group_name VARCHAR(255),
  group_description TEXT,
  group_picture_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  participant_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_groups_project ON public.evolution_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_groups_instance ON public.evolution_groups(instance_id);

-- Evolution API Notification Queue Table
CREATE TABLE IF NOT EXISTS public.evolution_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.evolution_instances(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  template_id UUID REFERENCES public.evolution_message_templates(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(50),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_queue_status ON public.evolution_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_evolution_queue_scheduled ON public.evolution_notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_evolution_queue_priority ON public.evolution_notification_queue(priority DESC, scheduled_at ASC);

-- ============================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_notification_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: RLS POLICIES
-- ============================================================

-- Instances: Only admins can manage
CREATE POLICY "Admins can manage evolution instances"
  ON public.evolution_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages: Users can view messages for their projects
CREATE POLICY "Users can view project evolution messages"
  ON public.evolution_messages FOR SELECT
  USING (
    project_id IS NULL OR 
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Admins can insert evolution messages"
  ON public.evolution_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Templates: Everyone can view active, admins can manage
CREATE POLICY "Everyone can view evolution templates"
  ON public.evolution_message_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage evolution templates"
  ON public.evolution_message_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Contacts: Users can view contacts linked to their projects
CREATE POLICY "Users can view project evolution contacts"
  ON public.evolution_contacts FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IS NULL OR
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Admins can manage evolution contacts"
  ON public.evolution_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Approvals: Users can view their own approval requests
CREATE POLICY "Users can view their evolution approvals"
  ON public.evolution_approval_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    approver_id = auth.uid() OR
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Admins can manage evolution approvals"
  ON public.evolution_approval_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Groups: Users can view groups for their projects
CREATE POLICY "Users can view project evolution groups"
  ON public.evolution_groups FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can manage evolution groups"
  ON public.evolution_groups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification Queue: Admins only
CREATE POLICY "Admins can manage evolution queue"
  ON public.evolution_notification_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- PART 4: INSERT DEFAULT TEMPLATES
-- ============================================================

INSERT INTO public.evolution_message_templates (template_key, name, content, variables, category, language) VALUES
  ('project_update_en', 'Project Update (EN)', E'📋 *Project Update*\n\nProject: {{project_name}}\nStatus: {{status}}\nProgress: {{progress}}%\n\nView details: {{portal_link}}', '["project_name", "status", "progress", "portal_link"]', 'notification', 'en-US'),
  ('project_update_pt', 'Atualização do Projeto (PT)', E'📋 *Atualização do Projeto*\n\nProjeto: {{project_name}}\nStatus: {{status}}\nProgresso: {{progress}}%\n\nVer detalhes: {{portal_link}}', '["project_name", "status", "progress", "portal_link"]', 'notification', 'pt-BR'),
  ('po_approval_en', 'PO Approval Request (EN)', E'🔔 *Approval Required*\n\nPO #{{po_number}}\nSupplier: {{supplier}}\nAmount: {{amount}}\n\nReply:\n✅ APPROVE {{code}}\n❌ REJECT {{code}}', '["po_number", "supplier", "amount", "code"]', 'approval', 'en-US'),
  ('po_approval_pt', 'Aprovação de OC (PT)', E'🔔 *Aprovação Necessária*\n\nOC #{{po_number}}\nFornecedor: {{supplier}}\nValor: {{amount}}\n\nResponda:\n✅ APROVAR {{code}}\n❌ REJEITAR {{code}}', '["po_number", "supplier", "amount", "code"]', 'approval', 'pt-BR'),
  ('daily_log_en', 'Daily Log Photo (EN)', E'📸 *Daily Log - {{project_name}}*\n\nDate: {{date}}\n{{description}}\n\nView more: {{portal_link}}', '["project_name", "date", "description", "portal_link"]', 'notification', 'en-US'),
  ('daily_log_pt', 'Foto do Diário de Obra (PT)', E'📸 *Diário de Obra - {{project_name}}*\n\nData: {{date}}\n{{description}}\n\nVer mais: {{portal_link}}', '["project_name", "date", "description", "portal_link"]', 'notification', 'pt-BR'),
  ('invoice_en', 'Invoice Notification (EN)', E'📄 *Invoice #{{invoice_number}}*\n\nProject: {{project_name}}\nAmount: {{amount}}\nDue Date: {{due_date}}\n\nPay via PIX or view: {{portal_link}}', '["invoice_number", "project_name", "amount", "due_date", "portal_link"]', 'notification', 'en-US'),
  ('invoice_pt', 'Notificação de Fatura (PT)', E'📄 *Fatura #{{invoice_number}}*\n\nProjeto: {{project_name}}\nValor: {{amount}}\nVencimento: {{due_date}}\n\nPague via PIX ou veja: {{portal_link}}', '["invoice_number", "project_name", "amount", "due_date", "portal_link"]', 'notification', 'pt-BR'),
  ('weather_alert_en', 'Weather Alert (EN)', E'⚠️ *Weather Alert*\n\nProject: {{project_name}}\nCondition: {{condition}}\nExpected: {{forecast}}\n\nTake necessary precautions.', '["project_name", "condition", "forecast"]', 'alert', 'en-US'),
  ('weather_alert_pt', 'Alerta Climático (PT)', E'⚠️ *Alerta Climático*\n\nProjeto: {{project_name}}\nCondição: {{condition}}\nPrevisão: {{forecast}}\n\nTome as precauções necessárias.', '["project_name", "condition", "forecast"]', 'alert', 'pt-BR'),
  ('milestone_en', 'Milestone Completed (EN)', E'🎉 *Milestone Completed!*\n\nProject: {{project_name}}\nMilestone: {{milestone_name}}\nCompleted: {{date}}\n\nCongratulations to the team!', '["project_name", "milestone_name", "date"]', 'notification', 'en-US'),
  ('milestone_pt', 'Marco Concluído (PT)', E'🎉 *Marco Concluído!*\n\nProjeto: {{project_name}}\nMarco: {{milestone_name}}\nConcluído em: {{date}}\n\nParabéns à equipe!', '["project_name", "milestone_name", "date"]', 'notification', 'pt-BR')
ON CONFLICT (template_key) DO NOTHING;

-- ============================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================

-- Function to format phone number for Brazil
CREATE OR REPLACE FUNCTION format_brazil_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove all non-digits
  cleaned := regexp_replace(phone, '\D', '', 'g');
  
  -- Add Brazil country code if not present
  IF NOT cleaned LIKE '55%' THEN
    cleaned := '55' || cleaned;
  END IF;
  
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to render Evolution API template with variables
CREATE OR REPLACE FUNCTION render_evolution_template(
  p_template_key TEXT,
  p_variables JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Get template content
  SELECT content INTO v_content
  FROM public.evolution_message_templates
  WHERE template_key = p_template_key AND is_active = true;
  
  IF v_content IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Replace variables
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_content := replace(v_content, '{{' || v_key || '}}', COALESCE(v_value, ''));
  END LOOP;
  
  -- Increment usage count
  UPDATE public.evolution_message_templates
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE template_key = p_template_key;
  
  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to queue an Evolution API notification
CREATE OR REPLACE FUNCTION queue_evolution_notification(
  p_recipient_phone TEXT,
  p_template_key TEXT,
  p_variables JSONB,
  p_project_id UUID DEFAULT NULL,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_message_content TEXT;
  v_instance_id UUID;
  v_template_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get primary instance
  SELECT id INTO v_instance_id
  FROM public.evolution_instances
  WHERE is_primary = true AND status = 'connected'
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'No connected Evolution API instance available';
  END IF;
  
  -- Get template
  SELECT id INTO v_template_id
  FROM public.evolution_message_templates
  WHERE template_key = p_template_key AND is_active = true;
  
  -- Render template
  v_message_content := render_evolution_template(p_template_key, p_variables);
  
  IF v_message_content IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive: %', p_template_key;
  END IF;
  
  -- Insert into queue
  INSERT INTO public.evolution_notification_queue (
    instance_id,
    project_id,
    recipient_phone,
    template_id,
    message_content,
    priority,
    scheduled_at
  ) VALUES (
    v_instance_id,
    p_project_id,
    format_brazil_phone(p_recipient_phone),
    v_template_id,
    v_message_content,
    p_priority,
    p_scheduled_at
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================
-- PART 6: INSERT ROADMAP ITEMS (Separate transaction)
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_sprint_id UUID;
  v_admin_id UUID;
  v_parent_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Get sprint ID (try both column names)
  SELECT id INTO v_sprint_id FROM public.sprints WHERE code = '2026-05' LIMIT 1;
  
  IF v_sprint_id IS NULL THEN
    SELECT id INTO v_sprint_id FROM public.sprints WHERE sprint_identifier = '2026-05' LIMIT 1;
  END IF;
  
  IF v_sprint_id IS NULL THEN
    RAISE NOTICE 'Sprint 2026-05 not found, creating it...';
    INSERT INTO public.sprints (code, title, description, status, start_date, end_date)
    VALUES ('2026-05', 'Sprint 2026-05', 'February 2026 Sprint including WhatsApp Integration', 'active', '2026-02-01', '2026-02-28')
    RETURNING id INTO v_sprint_id;
  END IF;
  
  -- Get first admin user for created_by field
  SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping roadmap_items creation';
    RETURN;
  END IF;
  
  -- Check if tasks already exist
  SELECT COUNT(*) INTO v_existing_count FROM public.roadmap_items 
  WHERE title LIKE 'WA-%' OR title LIKE '%WhatsApp Integration%';
  
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'WhatsApp Integration tasks already exist (% found), skipping...', v_existing_count;
    RETURN;
  END IF;
  
  -- ============================================================
  -- PARENT TASK: WhatsApp Integration Initiative
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES (
    v_sprint_id,
    '📱 WhatsApp Integration with Evolution API',
    E'# WhatsApp Integration Initiative\n\n## Overview\nIntegrate Evolution API for WhatsApp messaging capabilities in CastorWorks.\n\n## Phases\n1. Infrastructure Setup (2-3 days)\n2. Core Integration (3-4 days)\n3. Notification System (4-5 days)\n4. Advanced Features (5-7 days)\n5. Polish & Testing (2-3 days)\n\n## Total Estimated Effort: 80 hours\n\n## Reference\nSee docs/plans/castorworks-whatsapp-evolutionapi.md',
    'todo',
    'high',
    'integration',
    80,
    '2026-02-25',
    v_admin_id
  ) RETURNING id INTO v_parent_id;
  
  -- ============================================================
  -- PHASE 1: Infrastructure Setup Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by) VALUES
  (v_sprint_id, v_parent_id, 'WA-1.1: Deploy Evolution API Docker Container', 
   E'Deploy Evolution API Docker container on castorworks.cloud.\n\n### Deliverables\n- docker/docker-compose.evolution.yml\n- Environment variables configured\n- Container running on port 8080', 
   'done', 'critical', 'integration', 4, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.2: Configure Nginx Reverse Proxy', 
   E'Setup nginx reverse proxy for whatsapp.castorworks.cloud.\n\n### Deliverables\n- docker/nginx-whatsapp.conf\n- SSL certificate\n- WebSocket support', 
   'done', 'critical', 'integration', 2, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.3: Create WhatsApp Database Schema', 
   E'Create Evolution API database tables.\n\n### Tables\n- evolution_instances\n- evolution_messages\n- evolution_message_templates\n- evolution_contacts\n- evolution_approval_requests\n- evolution_groups\n- evolution_notification_queue', 
   'done', 'critical', 'integration', 3, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.4: Deploy WhatsApp Edge Functions', 
   E'Create Supabase Edge Functions.\n\n### Functions\n- evolution-webhook\n- evolution-send\n- evolution-connect', 
   'todo', 'critical', 'integration', 4, '2026-02-11', v_admin_id);
  
  -- ============================================================
  -- PHASE 2: Core Integration Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by) VALUES
  (v_sprint_id, v_parent_id, 'WA-2.1: Create WhatsApp React Hooks', 
   E'Create React hooks for Evolution API.\n\n### Hooks\n- useEvolutionInstance\n- useEvolutionMessages\n- useEvolutionTemplates\n- useEvolutionContacts', 
   'todo', 'high', 'feature', 6, '2026-02-12', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.2: Create WhatsApp Settings Admin Page', 
   E'Create admin page for WhatsApp config.\n\n### Features\n- Instance status display\n- QR code pairing\n- Template management', 
   'todo', 'high', 'feature', 8, '2026-02-13', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.3: Implement QR Code Connection Flow', 
   E'Full QR code pairing flow.\n\n### Flow\n1. Generate QR\n2. Display in UI\n3. User scans\n4. Status updates', 
   'todo', 'high', 'feature', 4, '2026-02-13', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.4: Test Basic Send and Receive Messages', 
   E'Verify message functionality.\n\n### Tests\n- Text messages\n- Images\n- Documents\n- Location', 
   'todo', 'high', 'integration', 4, '2026-02-14', v_admin_id);
  
  -- ============================================================
  -- PHASE 3: Notification System Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by) VALUES
  (v_sprint_id, v_parent_id, 'WA-3.1: Implement Notification Template System', 
   E'Template system with variable substitution.\n\n### Categories\n- project_update\n- po_approval\n- daily_log\n- invoice', 
   'todo', 'high', 'feature', 6, '2026-02-15', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.2: Create Notification Trigger System', 
   E'Auto-trigger notifications.\n\n### Triggers\n- Project status change\n- Daily log\n- PO created\n- Invoice generated', 
   'todo', 'high', 'feature', 8, '2026-02-16', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.3: Build WhatsApp Approval Workflow', 
   E'Approval via WhatsApp replies.\n\n### Types\n- Purchase Order\n- Change Order\n- Milestone\n- Document', 
   'todo', 'high', 'feature', 10, '2026-02-17', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.4: Add Daily Log Photo Sharing', 
   E'Auto-share daily log photos.\n\n### Features\n- Auto-share on save\n- Caption with description\n- Portal link', 
   'todo', 'medium', 'feature', 4, '2026-02-17', v_admin_id);
  
  -- ============================================================
  -- PHASE 4: Advanced Features Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by) VALUES
  (v_sprint_id, v_parent_id, 'WA-4.1: Implement Project Team Group Creation', 
   E'Auto-create WhatsApp groups.\n\n### Features\n- Create on project creation\n- Add team members\n- Sync changes', 
   'backlog', 'medium', 'feature', 8, '2026-02-19', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.2: Implement Automated Status Updates', 
   E'Automated project updates.\n\n### Types\n- Weekly summary\n- Milestone\n- Budget alerts', 
   'backlog', 'medium', 'feature', 6, '2026-02-20', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.3: Implement Payment Notifications', 
   E'Payment notifications.\n\n### Types\n- Invoice generated\n- Payment due\n- Payment received', 
   'backlog', 'medium', 'feature', 4, '2026-02-21', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.4: Integrate Weather Alerts', 
   E'Weather alerts for projects.\n\n### Features\n- Severe weather warnings\n- Rain forecasts', 
   'backlog', 'low', 'feature', 4, '2026-02-22', v_admin_id);
  
  -- ============================================================
  -- PHASE 5: Polish & Testing Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by) VALUES
  (v_sprint_id, v_parent_id, 'WA-5.1: Create E2E Tests for WhatsApp Integration', 
   E'E2E test suite.\n\n### Scenarios\n- Connect instance\n- Send messages\n- Approval workflow', 
   'backlog', 'high', 'integration', 8, '2026-02-23', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.2: Optimize WhatsApp Integration Performance', 
   E'Performance optimization.\n\n### Areas\n- Message queue\n- Batch sending\n- Error retry', 
   'backlog', 'medium', 'refinement', 4, '2026-02-24', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.3: Create WhatsApp Integration Documentation', 
   E'Documentation.\n\n### Docs\n- Admin guide\n- API reference\n- Troubleshooting', 
   'backlog', 'high', 'documentation', 4, '2026-02-24', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.4: Create WhatsApp User Guide', 
   E'User guide.\n\n### Topics\n- Connect WhatsApp\n- Notifications\n- Approval commands', 
   'backlog', 'medium', 'documentation', 3, '2026-02-25', v_admin_id);
  
  RAISE NOTICE 'WhatsApp Integration roadmap_items created: 1 parent + 20 subtasks';
END $$;

COMMIT;
