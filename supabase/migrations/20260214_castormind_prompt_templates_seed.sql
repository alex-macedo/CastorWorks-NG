BEGIN;

INSERT INTO public.castormind_prompt_templates (
  template_key,
  title,
  locale,
  intent,
  prompt_text,
  variable_schema,
  role_visibility,
  safety_hints,
  is_active,
  version
)
VALUES
  (
    'delayed_projects_overview_en',
    'Delayed Projects Overview',
    'en-US',
    'delayed_projects',
    'Show me all projects that are delayed and list overdue tasks.',
    '[]'::jsonb,
    ARRAY['admin','global_admin','project_manager','architect','site_supervisor','admin_office','viewer','accountant'],
    ARRAY['read_only'],
    true,
    1
  ),
  (
    'due_payments_snapshot_en',
    'Due Payments Snapshot',
    'en-US',
    'due_payments',
    'What clients have due payments and what is the due date by invoice?',
    '[]'::jsonb,
    ARRAY['admin','global_admin','project_manager','architect','admin_office','accountant'],
    ARRAY['read_only'],
    true,
    1
  ),
  (
    'update_tasks_until_today_en',
    'Close Tasks Until Today',
    'en-US',
    'update_tasks_until_today',
    'Update all the tasks in the schedule for project "{{project_name}}" until today.',
    '[{"name":"project_name","required":true}]'::jsonb,
    ARRAY['admin','global_admin','project_manager','site_supervisor'],
    ARRAY['mutation','confirm_project_name'],
    true,
    1
  ),
  (
    'missing_vendor_quotes_en',
    'Vendors Missing Proposals',
    'en-US',
    'quotes_without_vendor_proposal',
    'Show me all quotes where vendors did not return a proposal.',
    '[]'::jsonb,
    ARRAY['admin','global_admin','project_manager','architect','admin_office'],
    ARRAY['read_only'],
    true,
    1
  ),
  (
    'delayed_projects_overview_pt',
    'Projetos Atrasados',
    'pt-BR',
    'delayed_projects',
    'Mostre todos os projetos atrasados e liste as tarefas vencidas.',
    '[]'::jsonb,
    ARRAY['admin','global_admin','project_manager','architect','site_supervisor','admin_office','viewer','accountant'],
    ARRAY['read_only'],
    true,
    1
  ),
  (
    'due_payments_snapshot_pt',
    'Pagamentos em Aberto',
    'pt-BR',
    'due_payments',
    'Quais clientes têm pagamentos em aberto e qual o vencimento por fatura?',
    '[]'::jsonb,
    ARRAY['admin','global_admin','project_manager','architect','admin_office','accountant'],
    ARRAY['read_only'],
    true,
    1
  )
ON CONFLICT (template_key) DO UPDATE
SET
  title = EXCLUDED.title,
  locale = EXCLUDED.locale,
  intent = EXCLUDED.intent,
  prompt_text = EXCLUDED.prompt_text,
  variable_schema = EXCLUDED.variable_schema,
  role_visibility = EXCLUDED.role_visibility,
  safety_hints = EXCLUDED.safety_hints,
  is_active = EXCLUDED.is_active,
  version = EXCLUDED.version,
  updated_at = now();

COMMIT;

