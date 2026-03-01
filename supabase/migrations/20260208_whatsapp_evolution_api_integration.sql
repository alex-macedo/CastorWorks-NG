-- WhatsApp Evolution API Integration - Complete Migration
-- Sprint: 2026-05
-- Created: 2026-02-08
-- 
-- This migration includes:
-- 1. WhatsApp integration tables (instances, messages, templates, contacts, etc.)
-- 2. Roadmap items for tracking the WhatsApp integration project
--
-- Apply with:
--   scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260208_whatsapp_evolution_api_integration.sql castorworks:/tmp/
--   ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260208_whatsapp_evolution_api_integration.sql"

BEGIN;

-- ============================================================
-- PART 1: WHATSAPP INTEGRATION TABLES
-- ============================================================

-- WhatsApp Instances Table
-- Stores Evolution API instance configurations
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON public.whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_primary ON public.whatsapp_instances(is_primary);

-- WhatsApp Messages Table
-- Stores incoming and outgoing message history
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_project ON public.whatsapp_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON public.whatsapp_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_received ON public.whatsapp_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_id);

-- WhatsApp Templates Table
-- Stores message templates for notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_key ON public.whatsapp_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON public.whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON public.whatsapp_templates(is_active);

-- WhatsApp Contacts Table
-- Links WhatsApp numbers to users/clients
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user ON public.whatsapp_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_project ON public.whatsapp_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_opted_in ON public.whatsapp_contacts(opted_in);

-- WhatsApp Approval Requests Table
-- Tracks approvals requested via WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_approval_requests (
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_approvals_phone ON public.whatsapp_approval_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_approvals_status ON public.whatsapp_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_approvals_reference ON public.whatsapp_approval_requests(reference_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_approvals_project ON public.whatsapp_approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_approvals_code ON public.whatsapp_approval_requests(approval_code);

-- WhatsApp Groups Table
-- Tracks project WhatsApp groups
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_project ON public.whatsapp_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_instance ON public.whatsapp_groups(instance_id);

-- WhatsApp Notification Queue Table
-- Queue for outgoing notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON public.whatsapp_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_scheduled ON public.whatsapp_notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_priority ON public.whatsapp_notification_queue(priority DESC, scheduled_at ASC);

-- ============================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: RLS POLICIES
-- ============================================================

-- Instances: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Admins can manage whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages: Users can view messages for their projects
DROP POLICY IF EXISTS "Users can view project whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can view project whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (
    project_id IS NULL OR 
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Admins can insert whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Admins can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Templates: Everyone can view, admins can manage
DROP POLICY IF EXISTS "Everyone can view whatsapp templates" ON public.whatsapp_templates;
CREATE POLICY "Everyone can view whatsapp templates"
  ON public.whatsapp_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

DROP POLICY IF EXISTS "Admins can manage whatsapp templates" ON public.whatsapp_templates;
CREATE POLICY "Admins can manage whatsapp templates"
  ON public.whatsapp_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Contacts: Users can view contacts linked to their projects
DROP POLICY IF EXISTS "Users can view project whatsapp contacts" ON public.whatsapp_contacts;
CREATE POLICY "Users can view project whatsapp contacts"
  ON public.whatsapp_contacts FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IS NULL OR
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Admins can manage whatsapp contacts" ON public.whatsapp_contacts;
CREATE POLICY "Admins can manage whatsapp contacts"
  ON public.whatsapp_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Approvals: Users can view their own approval requests
DROP POLICY IF EXISTS "Users can view their whatsapp approvals" ON public.whatsapp_approval_requests;
CREATE POLICY "Users can view their whatsapp approvals"
  ON public.whatsapp_approval_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    approver_id = auth.uid() OR
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Admins can manage whatsapp approvals" ON public.whatsapp_approval_requests;
CREATE POLICY "Admins can manage whatsapp approvals"
  ON public.whatsapp_approval_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Groups: Users can view groups for their projects
DROP POLICY IF EXISTS "Users can view project whatsapp groups" ON public.whatsapp_groups;
CREATE POLICY "Users can view project whatsapp groups"
  ON public.whatsapp_groups FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins can manage whatsapp groups" ON public.whatsapp_groups;
CREATE POLICY "Admins can manage whatsapp groups"
  ON public.whatsapp_groups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification Queue: Admins only
DROP POLICY IF EXISTS "Admins can manage whatsapp queue" ON public.whatsapp_notification_queue;
CREATE POLICY "Admins can manage whatsapp queue"
  ON public.whatsapp_notification_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- PART 4: INSERT DEFAULT TEMPLATES
-- ============================================================

INSERT INTO public.whatsapp_templates (template_key, name, content, variables, category, language) VALUES
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
-- PART 5: INSERT ROADMAP ITEMS FOR WHATSAPP INTEGRATION
-- ============================================================

DO $$
DECLARE
  v_sprint_id UUID;
  v_admin_id UUID;
  v_parent_id UUID;
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
  
  -- Check if parent task already exists
  SELECT id INTO v_parent_id FROM public.roadmap_items 
  WHERE title = '📱 WhatsApp Integration with Evolution API' LIMIT 1;
  
  IF v_parent_id IS NOT NULL THEN
    RAISE NOTICE 'WhatsApp Integration tasks already exist, skipping...';
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
    E'# WhatsApp Integration Initiative\n\n## Overview\nIntegrate Evolution API for WhatsApp messaging capabilities in CastorWorks.\n\n## Phases\n1. Infrastructure Setup (2-3 days)\n2. Core Integration (3-4 days)\n3. Notification System (4-5 days)\n4. Advanced Features (5-7 days)\n5. Polish & Testing (2-3 days)\n\n## Total Estimated Effort: 80 hours\n\n## Reference\nSee docs/plans/castorworks-whatsapp-evolutionapi.md for full documentation.',
    'todo',
    'high',
    'integration',
    80,
    '2026-02-25',
    v_admin_id
  ) RETURNING id INTO v_parent_id;
  
  RAISE NOTICE 'Created parent task with ID: %', v_parent_id;
  
  -- ============================================================
  -- PHASE 1: Infrastructure Setup Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, v_parent_id, 'WA-1.1: Deploy Evolution API Docker Container', 
   E'## Task: Deploy Evolution API Container\n\n### Objective\nDeploy the Evolution API Docker container on castorworks.cloud server.\n\n### Acceptance Criteria\n- [ ] Docker container running on port 8080\n- [ ] Health check endpoint responding\n- [ ] Volumes configured for persistence\n- [ ] Environment variables configured\n\n### Files Created\n- docker/docker-compose.evolution.yml\n\n### Verification\n- curl http://localhost:8080 returns API info\n- docker ps shows evolution_api container running', 
   'done', 'critical', 'integration', 4, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.2: Configure Nginx Reverse Proxy', 
   E'## Task: Configure Nginx Reverse Proxy\n\n### Objective\nSet up nginx reverse proxy for whatsapp.castorworks.cloud subdomain.\n\n### Acceptance Criteria\n- [ ] SSL certificate obtained for whatsapp.castorworks.cloud\n- [ ] Nginx config created and enabled\n- [ ] WebSocket upgrade headers configured\n- [ ] HTTPS redirect working\n\n### Files Created\n- docker/nginx-whatsapp.conf\n\n### Verification\n- curl https://whatsapp.castorworks.cloud returns API info\n- WebSocket connections work through proxy', 
   'done', 'critical', 'integration', 2, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.3: Create WhatsApp Database Schema', 
   E'## Task: Create Database Migration\n\n### Objective\nCreate database tables for WhatsApp integration.\n\n### Tables Created\n- whatsapp_instances - Evolution API instance configs\n- whatsapp_messages - Message history\n- whatsapp_templates - Notification templates\n- whatsapp_contacts - Phone to user mapping\n- whatsapp_approval_requests - Approval tracking\n- whatsapp_groups - Project groups\n- whatsapp_notification_queue - Outgoing queue\n\n### Acceptance Criteria\n- [ ] Migration file created\n- [ ] RLS policies defined\n- [ ] Indexes created\n- [ ] Default templates inserted\n- [ ] Migration executed on remote database', 
   'done', 'critical', 'integration', 3, '2026-02-10', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-1.4: Deploy WhatsApp Edge Functions', 
   E'## Task: Deploy Edge Functions\n\n### Objective\nCreate and deploy Supabase Edge Functions for WhatsApp integration.\n\n### Functions to Create\n1. evolution-webhook - Receive Evolution API webhooks\n2. evolution-send - Send messages via Evolution API\n3. evolution-connect - Manage instance connection\n4. evolution-instance - Instance management\n\n### Acceptance Criteria\n- [ ] Edge functions created in supabase/functions/\n- [ ] Webhook function handles all event types\n- [ ] Send function supports text, media, location\n- [ ] Connect function generates QR codes', 
   'todo', 'critical', 'integration', 4, '2026-02-11', v_admin_id);
  
  -- ============================================================
  -- PHASE 2: Core Integration Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, v_parent_id, 'WA-2.1: Create WhatsApp React Hooks', 
   E'## Task: Create React Hooks\n\n### Objective\nCreate React hooks for WhatsApp integration.\n\n### Hooks to Create\n1. useWhatsAppInstance - Instance status and connection\n2. useWhatsAppMessages - Message history and sending\n3. useWhatsAppTemplates - Template management\n4. useWhatsAppContacts - Contact management\n5. useWhatsAppApprovals - Approval workflow\n\n### Files\n- src/hooks/useWhatsAppInstance.tsx\n- src/hooks/useWhatsAppMessages.tsx\n- src/hooks/useWhatsAppTemplates.tsx\n- src/hooks/useWhatsAppContacts.tsx\n- src/hooks/useWhatsAppApprovals.tsx', 
   'todo', 'high', 'feature', 6, '2026-02-12', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.2: Create WhatsApp Settings Admin Page', 
   E'## Task: Create WhatsApp Settings Page\n\n### Objective\nCreate admin settings page for WhatsApp configuration.\n\n### Features\n1. Instance connection status display\n2. QR code display for pairing\n3. Connection/disconnection controls\n4. Template management interface\n5. Contact opt-in management\n\n### File\n- src/pages/Admin/WhatsAppSettings.tsx\n- src/components/Admin/WhatsApp/*', 
   'todo', 'high', 'feature', 8, '2026-02-13', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.3: Implement QR Code Connection Flow', 
   E'## Task: Implement QR Code Connection Flow\n\n### Objective\nImplement the full QR code pairing flow for WhatsApp connection.\n\n### Flow\n1. User clicks "Connect WhatsApp"\n2. Edge function creates Evolution API instance\n3. QR code returned and displayed\n4. User scans with WhatsApp app\n5. Webhook receives connection confirmation\n6. UI updates to show connected status', 
   'todo', 'high', 'feature', 4, '2026-02-13', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-2.4: Test Basic Send and Receive Messages', 
   E'## Task: Test Basic Send/Receive\n\n### Objective\nVerify basic message sending and receiving functionality.\n\n### Test Cases\n1. Send text message to phone number\n2. Receive text message from phone\n3. Send image with caption\n4. Send document\n5. Send location', 
   'todo', 'high', 'integration', 4, '2026-02-14', v_admin_id);
  
  -- ============================================================
  -- PHASE 3: Notification System Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, v_parent_id, 'WA-3.1: Implement Notification Template System', 
   E'## Task: Implement Notification Templates\n\n### Objective\nCreate a template system for WhatsApp notifications with variable substitution.\n\n### Template Categories\n- project_update - Project status changes\n- po_approval - Purchase order approvals\n- daily_log - Daily log notifications\n- invoice - Invoice and payment notifications\n- reminder - General reminders\n- alert - Weather and emergency alerts', 
   'todo', 'high', 'feature', 6, '2026-02-15', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.2: Create Notification Trigger System', 
   E'## Task: Create Notification Trigger System\n\n### Objective\nCreate a system to automatically trigger WhatsApp notifications based on events.\n\n### Triggers\n1. Project status change → Notify stakeholders\n2. New daily log → Notify project team\n3. PO created → Notify approvers\n4. Invoice generated → Notify client\n5. Milestone completed → Notify all', 
   'todo', 'high', 'feature', 8, '2026-02-16', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.3: Build WhatsApp Approval Workflow', 
   E'## Task: Build Approval Workflow\n\n### Objective\nImplement approval workflows via WhatsApp replies.\n\n### Flow\n1. System sends approval request message with code\n2. User replies with APPROVE/REJECT + code\n3. Webhook receives and validates reply\n4. System processes approval\n5. Confirmation message sent\n\n### Approval Types\n- Purchase Order approval\n- Change Order approval\n- Milestone sign-off\n- Document approval\n- Budget approval', 
   'todo', 'high', 'feature', 10, '2026-02-17', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-3.4: Add Daily Log Photo Sharing', 
   E'## Task: Add Daily Log Photo Sharing\n\n### Objective\nAutomatically share daily log photos with project stakeholders via WhatsApp.\n\n### Features\n- Auto-share when daily log saved\n- Include caption with description\n- Send to project group or individuals\n- Include portal link', 
   'todo', 'medium', 'feature', 4, '2026-02-17', v_admin_id);
  
  -- ============================================================
  -- PHASE 4: Advanced Features Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, v_parent_id, 'WA-4.1: Implement Project Team Group Creation', 
   E'## Task: Project Team Group Creation\n\n### Objective\nAutomatically create WhatsApp groups for project teams.\n\n### Features\n- Create group on project creation\n- Add team members automatically\n- Set group name and description\n- Update group when team changes\n- Post announcements to group', 
   'backlog', 'medium', 'feature', 8, '2026-02-19', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.2: Implement Automated Status Updates', 
   E'## Task: Automated Status Updates\n\n### Objective\nSend automated project status updates via WhatsApp.\n\n### Update Types\n- Weekly progress summary\n- Milestone completions\n- Budget alerts\n- Schedule changes\n- Weather impacts', 
   'backlog', 'medium', 'feature', 6, '2026-02-20', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.3: Implement Payment Notifications', 
   E'## Task: Payment Notifications\n\n### Objective\nSend payment-related notifications via WhatsApp.\n\n### Notification Types\n- Invoice generated (with PDF)\n- Payment due reminder\n- Payment received confirmation\n- Overdue payment alert\n- PIX/payment link included', 
   'backlog', 'medium', 'feature', 4, '2026-02-21', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-4.4: Integrate Weather Alerts', 
   E'## Task: Weather Alerts Integration\n\n### Objective\nSend weather alerts to project teams via WhatsApp.\n\n### Features\n- Severe weather warnings\n- Rain forecasts\n- Temperature extremes\n- Location-based alerts', 
   'backlog', 'low', 'feature', 4, '2026-02-22', v_admin_id);
  
  -- ============================================================
  -- PHASE 5: Polish & Testing Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, parent_id, title, description, status, priority, category, estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, v_parent_id, 'WA-5.1: Create E2E Tests for WhatsApp Integration', 
   E'## Task: E2E Testing\n\n### Objective\nCreate comprehensive E2E tests for WhatsApp integration.\n\n### Test Scenarios\n1. Admin connects WhatsApp instance\n2. Send text message flow\n3. Receive message and process\n4. Approval workflow complete\n5. Template management CRUD\n6. Contact opt-in/opt-out', 
   'backlog', 'high', 'integration', 8, '2026-02-23', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.2: Optimize WhatsApp Integration Performance', 
   E'## Task: Performance Optimization\n\n### Objective\nOptimize WhatsApp integration for performance and reliability.\n\n### Areas\n- Message queue for reliability\n- Batch message sending\n- Connection pooling\n- Cache optimization\n- Error retry logic', 
   'backlog', 'medium', 'refinement', 4, '2026-02-24', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.3: Create WhatsApp Integration Documentation', 
   E'## Task: Create Documentation\n\n### Objective\nCreate comprehensive documentation for WhatsApp integration.\n\n### Documents\n1. Admin setup guide\n2. User guide for notifications\n3. API reference for developers\n4. Troubleshooting guide', 
   'backlog', 'high', 'documentation', 4, '2026-02-24', v_admin_id),
   
  (v_sprint_id, v_parent_id, 'WA-5.4: Create WhatsApp User Guide', 
   E'## Task: Create User Guide\n\n### Objective\nCreate end-user guide for WhatsApp features.\n\n### Topics\n1. How to connect WhatsApp\n2. Managing notifications\n3. Approval commands\n4. Opting in/out\n5. Troubleshooting', 
   'backlog', 'medium', 'documentation', 3, '2026-02-25', v_admin_id);
  
  RAISE NOTICE 'WhatsApp Integration roadmap_items created successfully in Sprint 2026-05';
  RAISE NOTICE 'Total tasks created: 20 (1 parent + 19 subtasks)';
END $$;

-- ============================================================
-- PART 6: HELPER FUNCTIONS
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

-- Function to render template with variables
CREATE OR REPLACE FUNCTION render_whatsapp_template(
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
  FROM public.whatsapp_templates
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
  UPDATE public.whatsapp_templates
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE template_key = p_template_key;
  
  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to queue a WhatsApp notification
CREATE OR REPLACE FUNCTION queue_whatsapp_notification(
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
  FROM public.whatsapp_instances
  WHERE is_primary = true AND status = 'connected'
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'No connected WhatsApp instance available';
  END IF;
  
  -- Get template
  SELECT id INTO v_template_id
  FROM public.whatsapp_templates
  WHERE template_key = p_template_key AND is_active = true;
  
  -- Render template
  v_message_content := render_whatsapp_template(p_template_key, p_variables);
  
  IF v_message_content IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive: %', p_template_key;
  END IF;
  
  -- Insert into queue
  INSERT INTO public.whatsapp_notification_queue (
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
