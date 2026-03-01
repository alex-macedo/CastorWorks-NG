// deno-lint-ignore no-import-prefix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedConfig {
  clientsCount?: number;
  projectsCount?: number;
  includeExpenses?: boolean;
  includeMaterials?: boolean;
  includeDocuments?: boolean;
}

// Helper function to register seeded data
async function registerSeedData(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  entityType: string,
  entityId: string,
  batchId: string,
  // deno-lint-ignore no-explicit-any
  metadata?: any
) {
  const { error } = await supabase.from('seed_data_registry').insert({
    entity_type: entityType,
    entity_id: entityId,
    seed_batch_id: batchId,
    metadata,
  });

  if (error) {
    console.error(`Failed to register seed data for ${entityType}:`, error);
    throw new Error(`Failed to register seed data for ${entityType}: ${error.message}`);
  }
}

// Helper function to pick random item from array
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random date within range
function randomDateBetween(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time).toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Diagnostic logging
      // Ensure architect_stages exist and capture their ids so opportunities can reference them
      const stagesToInsert = [
        { id: crypto.randomUUID(), name: 'Backlog', position: 1 },
        { id: crypto.randomUUID(), name: 'In Progress', position: 2 },
        { id: crypto.randomUUID(), name: 'Completed', position: 3 },
      ];

      // Upsert stages (safe if seeder runs multiple times)
      for (const s of stagesToInsert) {
        await db
          .insert('architect_stages')
          .values(s)
          .onConflictDoNothing()
          .execute();
      }

      // Map project to a default stage id for seeded opportunities
      const defaultStageId = stagesToInsert[0].id; // Backlog

      const opportunities = Array.from({ length: 20 }).map((_, i) => ({
        id: crypto.randomUUID(),
        project_id: pickRandom(projects).id,
        stage_id: defaultStageId,
        title: `Opportunity ${i + 1}`,
        description: `Description for opportunity ${i + 1}`,
        created_at: randomDateBetween(new Date(2023, 0, 1), new Date()),
      }));

      await db.insert('architect_opportunities').values(opportunities).execute();

    if (!supabaseUrl || !hasServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, config = {} } = await req.json() as { action: 'seed' | 'clear'; config?: SeedConfig };
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.email);

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error checking user roles:', rolesError);
      throw new Error(`Failed to check user roles: ${rolesError.message}`);
    }

    if (!roles || roles.length === 0) {
      console.log('User does not have admin role:', user.email);
      throw new Error('Only admins can manage seed data. Please ensure you have an admin role assigned in the user_roles table.');
    }

    console.log('Admin access confirmed for:', user.email);

    if (action === 'clear') {
      // Get all seed data to delete
      const { data: seedRecords } = await supabase
        .from('seed_data_registry')
        .select('entity_type, entity_id');

      if (seedRecords && seedRecords.length > 0) {
        // Group by entity type for efficient deletion
        const grouped = seedRecords.reduce((acc, record) => {
          if (!acc[record.entity_type]) acc[record.entity_type] = [];
          acc[record.entity_type].push(record.entity_id);
          return acc;
        }, {} as Record<string, string[]>);

        // Delete in correct order (children first, then parents) - comprehensive list
        const deleteOrder = [
          // Roadmap dependencies
          'roadmap_task_updates', 'roadmap_tasks', 'roadmap_item_upvotes', 'roadmap_item_comments',
          'roadmap_item_attachments', 'roadmap_suggestions', 'sprint_items_snapshot', 'roadmap_items', 'sprints', 'roadmap_phases',
          // Architect module dependencies
          'architect_task_comments', 'architect_tasks', 'architect_site_diary',
          'architect_meetings', 'architect_briefings', 'architect_opportunities',
          'architect_client_portal_tokens',
          // Document dependencies
          'document_activity_log', 'document_permissions', 'document_version_history', 'project_documents', 'project_folders',
          // Activity and resource dependencies
          'calendar_events', 'activity_resource_assignments', 'project_activities', 'scenario_activities', 'schedule_scenarios',
          // Time tracking
          'crew_time_logs', 'time_logs', 'daily_logs', 'site_activity_logs', 'activity_logs',
          // Financial and procurement
          'payment_transactions', 'delivery_confirmations', 'quote_approval_logs', 'quotes',
          'quote_requests', 'purchase_request_items', 'project_purchase_requests', 'purchase_orders',
          'project_financial_entries', 'project_budget_items', 'cost_predictions',
          // Project content
          'project_comments', 'mentions', 'project_photos', 'project_materials',
          'quality_inspections', 'site_issues', 'digital_signatures',
          'project_resources', 'project_milestones', 'project_phases',
          'project_team_members', 'client_project_access',
          // Estimates
          'estimates',
          // Projects
          'projects',
          // Clients and suppliers
          'suppliers', 'clients',
          // User data
          'user_preferences', 'user_roles', 'push_subscriptions',
          // Settings
          'config_translations', 'config_values', 'config_categories',
          // Reports and notifications
          'generated_reports', 'email_notifications',
        ];

        for (const entityType of deleteOrder) {
          if (grouped[entityType]) {
            try {
              await supabase
                .from(entityType)
                .delete()
                .in('id', grouped[entityType]);
            } catch (err) {
              console.warn(`Could not delete ${entityType}:`, err);
            }
          }
        }

        // Clear the registry
        await supabase.from('seed_data_registry').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      return new Response(JSON.stringify({ success: true, message: 'Seed data cleared' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'seed') {
      // Automatically clear existing seed data before seeding
      const { data: seedRecords } = await supabase
        .from('seed_data_registry')
        .select('entity_type, entity_id');

      if (seedRecords && seedRecords.length > 0) {
        // Clear existing data first (same logic as above)
        const grouped = seedRecords.reduce((acc, record) => {
          if (!acc[record.entity_type]) acc[record.entity_type] = [];
          acc[record.entity_type].push(record.entity_id);
          return acc;
        }, {} as Record<string, string[]>);

        const deleteOrder = [
          'roadmap_task_updates', 'roadmap_tasks', 'roadmap_item_upvotes', 'roadmap_item_comments',
          'roadmap_item_attachments', 'roadmap_suggestions', 'sprint_items_snapshot', 'roadmap_items', 'sprints', 'roadmap_phases',
          'architect_task_comments', 'architect_tasks', 'architect_site_diary',
          'architect_meetings', 'architect_briefings', 'architect_opportunities',
          'architect_client_portal_tokens',
          'document_activity_log', 'document_permissions', 'document_version_history', 'project_documents', 'project_folders',
          'calendar_events', 'activity_resource_assignments', 'project_activities', 'scenario_activities', 'schedule_scenarios',
          'crew_time_logs', 'time_logs', 'daily_logs', 'site_activity_logs', 'activity_logs',
          'payment_transactions', 'delivery_confirmations', 'quote_approval_logs', 'quotes',
          'quote_requests', 'purchase_request_items', 'project_purchase_requests', 'purchase_orders',
          'project_financial_entries', 'project_budget_items', 'cost_predictions',
          'project_comments', 'mentions', 'project_photos', 'project_materials',
          'quality_inspections', 'site_issues', 'digital_signatures',
          'project_resources', 'project_milestones', 'project_phases',
          'project_team_members', 'client_project_access',
          'estimates', 'projects', 'suppliers', 'clients',
          'user_preferences', 'user_roles', 'push_subscriptions',
          'config_translations', 'config_values', 'config_categories',
          'generated_reports', 'email_notifications',
        ];

        for (const entityType of deleteOrder) {
          if (grouped[entityType]) {
            try {
              await supabase.from(entityType).delete().in('id', grouped[entityType]);
            } catch (err) {
              console.warn(`Could not delete ${entityType}:`, err);
            }
          }
        }

        await supabase.from('seed_data_registry').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const batchId = crypto.randomUUID();
      const clientsCount = config.clientsCount || 4;
      const projectsCount = config.projectsCount || 8;

      // Comprehensive statistics tracking for ALL tables
      const stats = {
        // Base entities
        clients: 0,
        suppliers: 0,
        projects: 0,

        // Project structure
        project_phases: 0,
        project_activities: 0,
        project_resources: 0,
        activity_resource_assignments: 0,
        project_materials: 0,
        project_milestones: 0,
        project_folders: 0,
        project_team_members: 0,
        client_project_access: 0,

        // Financial
        project_financial_entries: 0,
        project_budget_items: 0,
        cost_predictions: 0,

        // Procurement cycle
        project_purchase_requests: 0,
        purchase_request_items: 0,
        quote_requests: 0,
        quotes: 0,
        quote_approval_logs: 0,
        purchase_orders: 0,
        delivery_confirmations: 0,
        payment_transactions: 0,

        // Documents & Photos
        project_documents: 0,
        project_photos: 0,
        project_comments: 0,

        // Time tracking
        time_logs: 0,
        daily_logs: 0,

        // Architect module
        architect_opportunities: 0,
        architect_briefings: 0,
        architect_meetings: 0,
        architect_site_diary: 0,
        architect_tasks: 0,
        architect_task_comments: 0,

        // Roadmap & Sprints
        sprints: 0,
        roadmap_phases: 0,
        roadmap_items: 0,
        roadmap_tasks: 0,
        roadmap_task_updates: 0,
        roadmap_item_comments: 0,
        roadmap_item_attachments: 0,
        sprint_items_snapshot: 0,

        // Other
        site_issues: 0,
        estimates: 0,
        calendar_events: 0,
        quality_inspections: 0,
        digital_signatures: 0,
        exchange_rates: 0,
      };

      // ==================== PHASE 1: BASE CONFIGURATION ====================

      console.log('Phase 1: Creating base configuration...');

      // Create currencies if not exist
      const currenciesData = [
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', exchange_rate: 1.0 },
        { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 0.20 },
        { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 0.18 },
      ];

      for (const curr of currenciesData) {
        const { error } = await supabase
          .from('currencies')
          .upsert({ id: curr.code, ...curr }, { onConflict: 'id' });
        if (error) console.warn('Currency upsert error:', error);
      }

      // Create exchange rates (historical data)
      const today = new Date();
      for (let dayOffset = 0; dayOffset < 30; dayOffset += 5) {
        const rateDate = new Date(today);
        rateDate.setDate(today.getDate() - dayOffset);

        const { error: usdError } = await supabase
          .from('exchange_rates')
          .upsert({
            from_currency: 'BRL',
            to_currency: 'USD',
            rate: 0.20 + (Math.random() * 0.02 - 0.01),
            effective_date: rateDate.toISOString().split('T')[0],
          }, { onConflict: 'from_currency,to_currency,effective_date' });

        const { error: eurError } = await supabase
          .from('exchange_rates')
          .upsert({
            from_currency: 'BRL',
            to_currency: 'EUR',
            rate: 0.18 + (Math.random() * 0.02 - 0.01),
            effective_date: rateDate.toISOString().split('T')[0],
          }, { onConflict: 'from_currency,to_currency,effective_date' });

        if (!usdError) stats.exchange_rates++;
        if (!eurError) stats.exchange_rates++;
        if (usdError || eurError) console.warn('Exchange rate upsert error');
      }

      // Create suppliers
      const suppliersData = [
        { name: 'Materiais de Construção ABC', category: 'Materials', email: 'vendas@materiaisabc.com.br', contact_phone: '+55 11 3456-7890', is_active: true },
        { name: 'Equipamentos Pesados Ltda', category: 'Equipment', email: 'aluguel@equipamentos.com.br', contact_phone: '+55 21 2345-6789', is_active: true },
        { name: 'Fornecedor de Cimento XYZ', category: 'Materials', email: 'contato@cimentoxyz.com.br', contact_phone: '+55 31 3234-5678', is_active: true },
        { name: 'Distribuidora de Aço Premium', category: 'Materials', email: 'comercial@acopremium.com.br', contact_phone: '+55 41 3123-4567', is_active: true },
        { name: 'Elétrica Industrial Silva', category: 'Electrical', email: 'vendas@eletricasilva.com.br', contact_phone: '+55 11 3567-8901', is_active: true },
        { name: 'Hidráulica e Acabamentos Norte', category: 'Plumbing', email: 'contato@hidraulicanorte.com.br', contact_phone: '+55 21 3678-9012', is_active: true },
      ];

      const createdSuppliers = [];
      for (const supplierData of suppliersData) {
        const { data: supplier, error } = await supabase
          .from('suppliers')
          .insert(supplierData)
          .select()
          .single();

        if (error) {
          console.error('Failed to create supplier:', error);
          throw new Error(`Failed to create supplier: ${error.message}`);
        }

        if (supplier) {
          createdSuppliers.push(supplier);
          await registerSeedData(supabase, 'suppliers', supplier.id, batchId);
          stats.suppliers++;
        }
      }

      // Create clients
      const clientsData = [
        { name: 'Construtora Silva & Associados', email: 'contato@silvaassociados.com.br', phone: '+55 11 3456-7890', location: 'São Paulo, SP', status: 'Active' },
        { name: 'Incorporadora Horizonte', email: 'projetos@horizonte.com.br', phone: '+55 21 2345-6789', location: 'Rio de Janeiro, RJ', status: 'Active' },
        { name: 'Construtora Porto Seguro', email: 'obras@portoseguro.com.br', phone: '+55 31 3234-5678', location: 'Belo Horizonte, MG', status: 'Active' },
        { name: 'Desenvolvimento Urbano Ltda', email: 'comercial@devurbano.com.br', phone: '+55 41 3123-4567', location: 'Curitiba, PR', status: 'Active' },
      ].slice(0, clientsCount);

      const createdClients = [];
      for (const clientData of clientsData) {
        const { data: client, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) {
          console.error('Failed to create client:', error);
          throw new Error(`Failed to create client: ${error.message}`);
        }

        if (client) {
          createdClients.push(client);
          await registerSeedData(supabase, 'clients', client.id, batchId);
          stats.clients++;
        }
      }

      // ==================== PHASE 2: USER SETUP ====================

      console.log('Phase 2: Setting up user data...');

      // Add user role if not exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!existingRole) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'admin',
          })
          .select()
          .single();

        if (userRole) {
          await registerSeedData(supabase, 'user_roles', userRole.id, batchId);
        }
      }

      // ==================== PHASE 3: PROJECTS CORE ====================

      console.log('Phase 3: Creating projects and core structures...');

      const projectScenarios = [
        { name: 'Residencial Alto Padrão - Leblon', type: 'residential', budget: 2500000, area: 350, scenario: 'on-track', completion: 45 },
        { name: 'Edifício Comercial Centro', type: 'commercial', budget: 5000000, area: 1200, scenario: 'completed', completion: 100 },
        { name: 'Condomínio Residencial Jardins', type: 'residential', budget: 8000000, area: 2500, scenario: 'delayed', completion: 35 },
        { name: 'Shopping Center Zona Sul', type: 'commercial', budget: 15000000, area: 5000, scenario: 'on-track', completion: 65 },
        { name: 'Galpão Industrial Logística', type: 'industrial', budget: 3500000, area: 2000, scenario: 'overrun', completion: 72 },
        { name: 'Reforma Apartamento Ipanema', type: 'residential', budget: 450000, area: 180, scenario: 'completed', completion: 100 },
        { name: 'Escritório Corporativo Faria Lima', type: 'commercial', budget: 1200000, area: 450, scenario: 'on-track', completion: 28 },
        { name: 'Casa de Campo Petrópolis', type: 'residential', budget: 1800000, area: 500, scenario: 'delayed', completion: 58 },
      ].slice(0, projectsCount);

      const createdProjects = [];

      for (let i = 0; i < projectScenarios.length; i++) {
        const scenario = projectScenarios[i];
        const client = createdClients[i % createdClients.length];

        // Calculate realistic dates
        const startDate = new Date();
        let endDate = new Date();
        let actualStatus: string;

        if (scenario.scenario === 'completed') {
          startDate.setMonth(startDate.getMonth() - (6 + Math.floor(Math.random() * 6)));
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 6);
          actualStatus = 'completed';
        } else if (scenario.scenario === 'delayed') {
          startDate.setMonth(startDate.getMonth() - (8 + Math.floor(Math.random() * 4)));
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 10);
          actualStatus = 'active';
        } else if (scenario.scenario === 'overrun') {
          startDate.setMonth(startDate.getMonth() - (7 + Math.floor(Math.random() * 3)));
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 8);
          actualStatus = 'active';
        } else {
          startDate.setMonth(startDate.getMonth() - (3 + Math.floor(Math.random() * 4)));
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 8);
          actualStatus = 'active';
        }

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: scenario.name,
            client_id: client.id,
            status: actualStatus,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            budget_total: scenario.budget,
            location: client.location,
            type: scenario.type,
            total_area: scenario.area,
            manager: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Project Manager',
          })
          .select()
          .single();

        if (projectError) {
          console.error('Failed to create project:', projectError);
          throw new Error(`Failed to create project: ${projectError.message}`);
        }

        if (!project) continue;

        createdProjects.push({ ...project, scenario });
        await registerSeedData(supabase, 'projects', project.id, batchId, { scenario: scenario.scenario });
        stats.projects++;

        // Create project folder structure
        const folderNames = ['Documents', 'Photos', 'Reports', 'Contracts', 'Plans'];
        const createdFolders = [];

        for (const folderName of folderNames) {
          const { data: folder } = await supabase
            .from('project_folders')
            .insert({
              project_id: project.id,
              folder_name: folderName,
              created_by: user.id,
            })
            .select()
            .single();

          if (folder) {
            createdFolders.push(folder);
            await registerSeedData(supabase, 'project_folders', folder.id, batchId);
            stats.project_folders++;
          }
        }

        // Create project team member
        const { data: teamMember } = await supabase
          .from('project_team_members')
          .insert({
            project_id: project.id,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Team Member',
            role: 'Project Manager',
            email: user.email,
          })
          .select()
          .single();

        if (teamMember) {
          await registerSeedData(supabase, 'project_team_members', teamMember.id, batchId);
          stats.project_team_members++;
        }

        // Create client access
        const { data: clientAccess } = await supabase
          .from('client_project_access')
          .insert({
            client_id: client.id,
            project_id: project.id,
            access_level: 'view',
            can_view_documents: true,
            can_view_financials: scenario.scenario === 'completed',
            can_download_reports: true,
          })
          .select()
          .single();

        if (clientAccess) {
          await registerSeedData(supabase, 'client_project_access', clientAccess.id, batchId);
          stats.client_project_access++;
        }

        // Create project resources
        const resourcesData = [
          { name: 'Lead Engineer', type: 'labor', rate_per_unit: 120, unit: 'hour', availability: 40 },
          { name: 'Construction Workers', type: 'labor', rate_per_unit: 45, unit: 'hour', availability: 160 },
          { name: 'Excavator', type: 'equipment', rate_per_unit: 250, unit: 'day', availability: 30 },
          { name: 'Concrete Mixer', type: 'equipment', rate_per_unit: 80, unit: 'day', availability: 60 },
        ];

        const createdResources = [];
        for (const resData of resourcesData) {
          const { data: resource } = await supabase
            .from('project_resources')
            .insert({
              project_id: project.id,
              ...resData,
            })
            .select()
            .single();

          if (resource) {
            createdResources.push(resource);
            await registerSeedData(supabase, 'project_resources', resource.id, batchId);
            stats.project_resources++;
          }
        }

        // Create phases
        const { data: phaseTemplate } = await supabase
          .from('phase_templates')
          .select('*')
          .eq('is_default', true)
          .single();

        // deno-lint-ignore no-explicit-any
        const phases: any[] = phaseTemplate?.phases || [
          { name: 'Foundation & Site Prep', budget_percentage: 20 },
          { name: 'Structure & Framing', budget_percentage: 25 },
          { name: 'MEP Installation', budget_percentage: 15 },
          { name: 'Interior Finishing', budget_percentage: 20 },
          { name: 'Exterior & Landscaping', budget_percentage: 15 },
          { name: 'Final Inspection & Handover', budget_percentage: 5 },
        ];

        const createdPhases = [];
        const targetCompletion = scenario.completion;

        for (let j = 0; j < phases.length; j++) {
          const phase = phases[j];
          const phaseProgress = Math.floor((j / phases.length) * 100);

          const projectDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const phaseDuration = projectDuration / phases.length;

          const phaseStart = new Date(startDate);
          phaseStart.setDate(phaseStart.getDate() + Math.floor(j * phaseDuration));
          const phaseEnd = new Date(phaseStart);
          phaseEnd.setDate(phaseEnd.getDate() + Math.floor(phaseDuration));

          let phaseStatus: string;
          let phaseProgressPct: number;

          if (phaseProgress < targetCompletion - 15) {
            phaseStatus = 'completed';
            phaseProgressPct = 100;
          } else if (phaseProgress < targetCompletion + 5) {
            phaseStatus = 'in_progress';
            phaseProgressPct = Math.floor(Math.random() * 60) + 20;
          } else {
            phaseStatus = 'pending';
            phaseProgressPct = 0;
          }

          const budgetAllocated = scenario.budget * ((phase.budget_percentage || Math.floor(100 / phases.length)) / 100);

          const { data: createdPhase } = await supabase
            .from('project_phases')
            .insert({
              project_id: project.id,
              phase_name: phase.name,
              budget_allocated: budgetAllocated,
              start_date: phaseStart.toISOString().split('T')[0],
              end_date: phaseEnd.toISOString().split('T')[0],
              status: phaseStatus,
              progress_percentage: phaseProgressPct,
            })
            .select()
            .single();

          if (createdPhase) {
            createdPhases.push(createdPhase);
            await registerSeedData(supabase, 'project_phases', createdPhase.id, batchId);
            stats.project_phases++;
          }
        }

        // Create milestones
        const milestones = ['Foundation Complete', 'Structure Complete', 'Roof Complete', 'Final Inspection'];
        for (let m = 0; m < Math.min(milestones.length, createdPhases.length); m++) {
          const phase = createdPhases[m];
          const { data: milestone } = await supabase
            .from('project_milestones')
            .insert({
              project_id: project.id,
              phase_id: phase.id,
              milestone_name: milestones[m],
              target_date: phase.end_date,
              status: phase.status === 'completed' ? 'achieved' : 'pending',
            })
            .select()
            .single();

          if (milestone) {
            await registerSeedData(supabase, 'project_milestones', milestone.id, batchId);
            stats.project_milestones++;
          }
        }

        // ==================== PHASE 4: OPERATIONS ====================

        console.log(`Phase 4: Adding operational data for project ${i + 1}...`);

        // Create activities
        const { data: activityTemplate } = await supabase
          .from('activity_templates')
          .select('*')
          .eq('is_default', true)
          .single();

        // deno-lint-ignore no-explicit-any
        const activities: any[] = activityTemplate?.activities || [
          { name: 'Site Survey & Planning' },
          { name: 'Excavation & Grading' },
          { name: 'Foundation Pour' },
          { name: 'Framing & Structure' },
          { name: 'Roofing Installation' },
          { name: 'Electrical Rough-In' },
          { name: 'Plumbing Installation' },
          { name: 'HVAC Installation' },
          { name: 'Drywall & Insulation' },
          { name: 'Flooring Installation' },
          { name: 'Paint & Finishing' },
          { name: 'Cabinetry & Fixtures' },
          { name: 'Landscaping' },
          { name: 'Final Cleanup' },
          { name: 'Inspection & Handover' },
        ];

        const createdActivities = [];
        const phasesToPopulate = createdPhases.filter(p => p.status === 'completed' || p.status === 'in_progress');
        const activitiesPerPhase = Math.ceil(activities.length / Math.max(1, phasesToPopulate.length));

        let activityIndex = 0;
        for (const phase of phasesToPopulate) {
          const numActivities = Math.min(activitiesPerPhase, activities.length - activityIndex);

          for (let k = 0; k < numActivities && activityIndex < activities.length; k++, activityIndex++) {
            const activity = activities[activityIndex];
            const phaseDuration = (new Date(phase.end_date).getTime() - new Date(phase.start_date).getTime()) / (1000 * 60 * 60 * 24);
            const activityDuration = Math.max(1, Math.floor(phaseDuration / numActivities));

            const activityStart = new Date(phase.start_date);
            activityStart.setDate(activityStart.getDate() + (k * activityDuration));
            const activityEnd = new Date(activityStart);
            activityEnd.setDate(activityEnd.getDate() + activityDuration);

            let activityCompletion: number;
            if (phase.status === 'completed') {
              activityCompletion = 100;
            } else {
              const progressInPhase = k / numActivities;
              if (progressInPhase < 0.5) {
                activityCompletion = Math.floor(Math.random() * 40) + 60;
              } else if (progressInPhase < 0.8) {
                activityCompletion = Math.floor(Math.random() * 50) + 20;
              } else {
                activityCompletion = Math.floor(Math.random() * 30);
              }
            }

            const { data: createdActivity } = await supabase
              .from('project_activities')
              .insert({
                project_id: project.id,
                phase_id: phase.id,
                name: activity.name,
                sequence: activityIndex + 1,
                start_date: activityStart.toISOString().split('T')[0],
                end_date: activityEnd.toISOString().split('T')[0],
                days_for_activity: activityDuration,
                completion_percentage: activityCompletion,
              })
              .select()
              .single();

            if (createdActivity) {
              createdActivities.push(createdActivity);
              await registerSeedData(supabase, 'project_activities', createdActivity.id, batchId);
              stats.project_activities++;

              // Create activity resource assignments
              if (createdResources.length > 0 && Math.random() > 0.3) {
                const resource = pickRandom(createdResources);
                const { data: assignment } = await supabase
                  .from('activity_resource_assignments')
                  .insert({
                    activity_id: createdActivity.id,
                    resource_id: resource.id,
                    units_required: Math.floor(Math.random() * 40) + 8,
                    allocation_percentage: Math.floor(Math.random() * 50) + 50,
                  })
                  .select()
                  .single();

                if (assignment) {
                  await registerSeedData(supabase, 'activity_resource_assignments', assignment.id, batchId);
                  stats.activity_resource_assignments++;
                }
              }

              // Create calendar event for this activity
              const { data: calEvent } = await supabase
                .from('calendar_events')
                .insert({
                  project_id: project.id,
                  activity_id: createdActivity.id,
                  event_title: activity.name,
                  event_description: `Scheduled activity for ${scenario.name}`,
                  start_date: activityStart.toISOString(),
                  end_date: activityEnd.toISOString(),
                })
                .select()
                .single();

              if (calEvent) {
                await registerSeedData(supabase, 'calendar_events', calEvent.id, batchId);
                stats.calendar_events++;
              }
            }
          }
        }

        // Create materials
        if (scenario.completion > 20) {
          const materials = [
            { name: 'Cimento CP-II', quantity: 500, unit: 'ton', cost: 35 },
            { name: 'Areia Média', quantity: 800, unit: 'ton', cost: 50 },
            { name: 'Brita 1', quantity: 600, unit: 'ton', cost: 75 },
            { name: 'Vergalhão 10mm', quantity: 5000, unit: 'kg', cost: 8.5 },
            { name: 'Tijolo Cerâmico', quantity: 20000, unit: 'un', cost: 1.2 },
            { name: 'Concreto Usinado', quantity: 150, unit: 'm³', cost: 350 },
          ];

          const materialCount = scenario.scenario === 'completed' ? materials.length : Math.floor(materials.length * 0.6);

          for (let m = 0; m < materialCount; m++) {
            const mat = materials[m];
            const { data: material } = await supabase
              .from('project_materials')
              .insert({
                project_id: project.id,
                material_name: mat.name,
                quantity: mat.quantity + Math.floor(Math.random() * 100),
                unit: mat.unit,
                unit_cost: mat.cost,
              })
              .select()
              .single();

            if (material) {
              await registerSeedData(supabase, 'project_materials', material.id, batchId);
              stats.project_materials++;
            }
          }
        }

        // Create comprehensive financial entries (BOTH income AND expense)
        if (scenario.completion > 10) {
          // Income entries - client payments based on milestone completion
          const incomeCategories = ['Initial Payment', 'Progress Payment', 'Milestone Payment', 'Final Payment'];
          const incomeCount = Math.max(2, Math.floor(scenario.completion / 25));

          for (let inc = 0; inc < incomeCount; inc++) {
            const incomeDate = randomDateBetween(startDate, new Date());
            const paymentAmount = scenario.budget * (0.15 + Math.random() * 0.20); // 15-35% of budget

            const { data: incomeEntry } = await supabase
              .from('project_financial_entries')
              .insert({
                project_id: project.id,
                entry_type: 'income',
                category: incomeCategories[Math.min(inc, incomeCategories.length - 1)],
                amount: paymentAmount,
                date: incomeDate,
                description: `${incomeCategories[Math.min(inc, incomeCategories.length - 1)]} received from client`,
                currency: 'BRL',
                payment_method: pickRandom(['Bank Transfer', 'Wire Transfer', 'Check']),
                recipient_payer: client.name,
                reference: `INV-${batchId.substring(0, 6)}-${inc + 1}`,
              })
              .select()
              .single();

            if (incomeEntry) {
              await registerSeedData(supabase, 'project_financial_entries', incomeEntry.id, batchId);
              stats.project_financial_entries++;
            }
          }

          // Expense entries - detailed breakdown by category
          const expenseCategories = [
            { name: 'Materials', avgAmount: scenario.budget * 0.35, count: 3 },
            { name: 'Labor', avgAmount: scenario.budget * 0.30, count: 4 },
            { name: 'Equipment Rental', avgAmount: scenario.budget * 0.10, count: 2 },
            { name: 'Subcontractors', avgAmount: scenario.budget * 0.15, count: 2 },
            { name: 'Permits & Fees', avgAmount: scenario.budget * 0.05, count: 1 },
            { name: 'Overhead', avgAmount: scenario.budget * 0.05, count: 2 },
          ];

          for (const expCat of expenseCategories) {
            const catCount = Math.floor((scenario.completion / 100) * expCat.count);
            for (let exp = 0; exp < catCount; exp++) {
              const expenseDate = randomDateBetween(startDate, new Date());
              const expenseAmount = expCat.avgAmount / expCat.count * (0.8 + Math.random() * 0.4);

              const { data: expenseEntry } = await supabase
                .from('project_financial_entries')
                .insert({
                  project_id: project.id,
                  entry_type: 'expense',
                  category: expCat.name,
                  amount: expenseAmount,
                  date: expenseDate,
                  description: `${expCat.name} expense for project ${scenario.name}`,
                  currency: 'BRL',
                  payment_method: pickRandom(['Bank Transfer', 'Check', 'Cash', 'Credit Card']),
                  recipient_payer: pickRandom([
                    'ABC Suppliers', 'Construction Co', 'Equipment Rental Inc',
                    'Labor Contractor', 'Municipal Office', 'Utility Provider'
                  ]),
                })
                .select()
                .single();

              if (expenseEntry) {
                await registerSeedData(supabase, 'project_financial_entries', expenseEntry.id, batchId);
                stats.project_financial_entries++;
              }
            }
          }
        }

        // Create budget items for ALL phases (comprehensive breakdown)
        for (const phase of createdPhases) {
          // Main phase budget
          const { data: phaseBudget } = await supabase
            .from('project_budget_items')
            .insert({
              project_id: project.id,
              phase_id: phase.id,
              category: phase.phase_name,
              description: `Overall budget for ${phase.phase_name}`,
              budgeted_amount: phase.budget_allocated,
              actual_amount: phase.status === 'completed'
                ? phase.budget_allocated * (0.9 + Math.random() * 0.15)
                : phase.budget_allocated * (phase.progress_percentage / 100) * (0.9 + Math.random() * 0.2),
            })
            .select()
            .single();

          if (phaseBudget) {
            await registerSeedData(supabase, 'project_budget_items', phaseBudget.id, batchId);
            stats.project_budget_items++;
          }

          // Detailed budget breakdown for each phase
          const phaseCategories = [
            { name: 'Materials', percentage: 0.40 },
            { name: 'Labor', percentage: 0.35 },
            { name: 'Equipment', percentage: 0.15 },
            { name: 'Other', percentage: 0.10 },
          ];

          for (const cat of phaseCategories) {
            const categoryBudget = phase.budget_allocated * cat.percentage;
            const categoryActual = phase.status === 'completed'
              ? categoryBudget * (0.9 + Math.random() * 0.15)
              : categoryBudget * (phase.progress_percentage / 100) * (0.85 + Math.random() * 0.25);

            const { data: catBudget } = await supabase
              .from('project_budget_items')
              .insert({
                project_id: project.id,
                phase_id: phase.id,
                category: `${phase.phase_name} - ${cat.name}`,
                description: `${cat.name} budget for ${phase.phase_name}`,
                budgeted_amount: categoryBudget,
                actual_amount: categoryActual,
              })
              .select()
              .single();

            if (catBudget) {
              await registerSeedData(supabase, 'project_budget_items', catBudget.id, batchId);
              stats.project_budget_items++;
            }
          }
        }

        // Create daily logs
        if (scenario.completion > 30) {
          const logCount = Math.floor(scenario.completion / 20);
          for (let l = 0; l < logCount; l++) {
            const logDate = randomDateBetween(startDate, new Date());
            const { data: log } = await supabase
              .from('daily_logs')
              .insert({
                project_id: project.id,
                log_date: logDate,
                weather_conditions: pickRandom(['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy']),
                temperature: Math.floor(Math.random() * 15) + 15,
                work_hours: Math.floor(Math.random() * 4) + 6,
                workers_count: Math.floor(Math.random() * 20) + 5,
                notes: `Daily progress update for ${scenario.name}`,
                created_by: user.id,
              })
              .select()
              .single();

            if (log) {
              await registerSeedData(supabase, 'daily_logs', log.id, batchId);
              stats.daily_logs++;
            }
          }
        }

        // Create time logs
        if (scenario.completion > 20 && createdActivities.length > 0) {
          const timeLogCount = Math.floor(scenario.completion / 15);
          for (let t = 0; t < timeLogCount; t++) {
            const activity = pickRandom(createdActivities);
            const { data: timeLog } = await supabase
              .from('time_logs')
              .insert({
                project_id: project.id,
                activity_id: activity.id,
                user_name: user.user_metadata?.full_name || 'Worker',
                log_date: randomDateBetween(new Date(activity.start_date), new Date(activity.end_date)),
                hours_worked: Math.floor(Math.random() * 8) + 1,
                description: `Work on ${activity.name}`,
              })
              .select()
              .single();

            if (timeLog) {
              await registerSeedData(supabase, 'time_logs', timeLog.id, batchId);
              stats.time_logs++;
            }
          }
        }

        // Create photos
        if (scenario.completion > 15) {
          const photoCount = Math.floor(scenario.completion / 20) + 1;
          for (let p = 0; p < photoCount; p++) {
            const { data: photo } = await supabase
              .from('project_photos')
              .insert({
                project_id: project.id,
                photo_url: `https://placehold.co/800x600/png?text=Project+Photo+${p + 1}`,
                caption: `Progress photo ${p + 1} for ${scenario.name}`,
                uploaded_by: user.id,
              })
              .select()
              .single();

            if (photo) {
              await registerSeedData(supabase, 'project_photos', photo.id, batchId);
              stats.project_photos++;
            }
          }
        }

        // Create comments
        if (scenario.completion > 25) {
          const commentCount = Math.floor(scenario.completion / 30) + 1;
          for (let c = 0; c < commentCount; c++) {
            const { data: comment } = await supabase
              .from('project_comments')
              .insert({
                project_id: project.id,
                comment_text: `Great progress on ${scenario.name}! Keep up the good work.`,
                created_by: user.id,
                author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              })
              .select()
              .single();

            if (comment) {
              await registerSeedData(supabase, 'project_comments', comment.id, batchId);
              stats.project_comments++;
            }
          }
        }

        // Create documents
        if (createdFolders.length > 0 && scenario.completion > 10) {
          const docCount = Math.min(3, Math.floor(scenario.completion / 30) + 1);
          for (let d = 0; d < docCount; d++) {
            const folder = createdFolders[d % createdFolders.length];
            const { data: doc } = await supabase
              .from('project_documents')
              .insert({
                project_id: project.id,
                folder_id: folder.id,
                document_name: `Document ${d + 1}.pdf`,
                file_path: `/documents/demo/doc${d + 1}.pdf`,
                file_type: 'application/pdf',
                file_size: Math.floor(Math.random() * 1000000) + 100000,
                uploaded_by: user.id,
              })
              .select()
              .single();

            if (doc) {
              await registerSeedData(supabase, 'project_documents', doc.id, batchId);
              stats.project_documents++;
            }
          }
        }

        // Create quality inspections
        if (scenario.completion > 40 && createdPhases.length > 0) {
          const phase = pickRandom(createdPhases.filter(p => p.status === 'completed'));
          if (phase) {
            const { data: inspection } = await supabase
              .from('quality_inspections')
              .insert({
                project_id: project.id,
                phase_id: phase.id,
                inspection_type: pickRandom(['Initial', 'Progress', 'Final']),
                inspection_date: randomDateBetween(new Date(phase.start_date), new Date(phase.end_date)),
                inspector_name: 'Quality Inspector',
                result: pickRandom(['Approved', 'Approved with Comments']),
                notes: `Inspection completed for ${phase.phase_name}`,
              })
              .select()
              .single();

            if (inspection) {
              await registerSeedData(supabase, 'quality_inspections', inspection.id, batchId);
              stats.quality_inspections++;
            }
          }
        }

        // Create site activity logs
        if (scenario.completion > 20) {
          const activityLogCount = Math.floor(scenario.completion / 25);
          for (let al = 0; al < activityLogCount; al++) {
            const { data: actLog } = await supabase
              .from('site_activity_logs')
              .insert({
                project_id: project.id,
                activity_type: pickRandom(['Material Delivery', 'Equipment Arrival', 'Inspection', 'Visitor']),
                log_date: randomDateBetween(startDate, new Date()),
                description: `Site activity recorded for ${scenario.name}`,
                logged_by: user.id,
              })
              .select()
              .single();

            if (actLog) {
              await registerSeedData(supabase, 'site_activity_logs', actLog.id, batchId);
            }
          }
        }

        // ==================== PHASE 5: PROCUREMENT ====================

        console.log(`Phase 5: Adding procurement data for project ${i + 1}...`);

        // Create purchase requests and orders
        if ((scenario.scenario === 'completed' || scenario.scenario === 'on-track' || scenario.completion > 30) && createdSuppliers.length > 0) {
          const poCount = scenario.scenario === 'completed' ? 2 : 1;

          for (let poIdx = 0; poIdx < poCount; poIdx++) {
            const supplier = pickRandom(createdSuppliers);

            // Create purchase request first
            const { data: purchaseRequest } = await supabase
              .from('project_purchase_requests')
              .insert({
                project_id: project.id,
                requested_by: user.user_metadata?.full_name || 'Procurement Manager',
                priority: pickRandom(['low', 'medium', 'high']),
                status: pickRandom(['pending', 'approved', 'ordered']),
                delivery_date: randomDateBetween(startDate, endDate),
                notes: `Purchase request for ${scenario.name}`,
                total_estimated: Math.floor(Math.random() * 50000) + 10000,
                total_actual: 0,
              })
              .select()
              .single();

            if (purchaseRequest) {
              await registerSeedData(supabase, 'project_purchase_requests', purchaseRequest.id, batchId);
              stats.project_purchase_requests++;

              // Create purchase request items
              const itemCount = Math.floor(Math.random() * 3) + 1;
              const createdPRItems = [];

              for (let itemIdx = 0; itemIdx < itemCount; itemIdx++) {
                const { data: prItem } = await supabase
                  .from('purchase_request_items')
                  .insert({
                    request_id: purchaseRequest.id,
                    description: `Item ${itemIdx + 1} - ${pickRandom(['Cement', 'Steel', 'Concrete', 'Bricks'])}`,
                    quantity: Math.floor(Math.random() * 100) + 10,
                    unit: pickRandom(['ton', 'kg', 'm³', 'un']),
                    estimated_price: Math.floor(Math.random() * 20000) + 5000,
                    actual_price: 0,
                  })
                  .select()
                  .single();

                if (prItem) {
                  createdPRItems.push(prItem);
                  await registerSeedData(supabase, 'purchase_request_items', prItem.id, batchId);
                  stats.purchase_request_items++;
                }
              }

              // COMPLETE PROCUREMENT CYCLE: Create quote requests and quotes
              if (createdPRItems.length > 0 && Math.random() > 0.3) {
                // Select 2-3 suppliers to request quotes from
                const quoteSuppliers = [supplier];
                if (createdSuppliers.length > 1) {
                  const otherSuppliers = createdSuppliers.filter(s => s.id !== supplier.id);
                  if (otherSuppliers.length > 0) {
                    quoteSuppliers.push(pickRandom(otherSuppliers));
                  }
                  if (otherSuppliers.length > 1 && Math.random() > 0.5) {
                    quoteSuppliers.push(pickRandom(otherSuppliers.filter(s => !quoteSuppliers.includes(s))));
                  }
                }

                for (const quoteSupplier of quoteSuppliers) {
                  // Create quote request
                  const { data: quoteRequest } = await supabase
                    .from('quote_requests')
                    .insert({
                      purchase_request_id: purchaseRequest.id,
                      supplier_id: quoteSupplier.id,
                      requested_by: user.id,
                      status: pickRandom(['pending', 'received', 'accepted', 'rejected']),
                      notes: `Quote request for ${scenario.name}`,
                    })
                    .select()
                    .single();

                  if (quoteRequest) {
                    await registerSeedData(supabase, 'quote_requests', quoteRequest.id, batchId);
                    stats.quote_requests++;

                    // Create quotes for each purchase request item
                    for (const prItem of createdPRItems) {
                      const quotePrice = Number(prItem.estimated_price) * (0.85 + Math.random() * 0.30);
                      const { data: quote } = await supabase
                        .from('quotes')
                        .insert({
                          purchase_request_item_id: prItem.id,
                          supplier_id: quoteSupplier.id,
                          unit_price: quotePrice / Number(prItem.quantity),
                          total_price: quotePrice,
                          currency: 'BRL',
                          lead_time_days: Math.floor(Math.random() * 20) + 5,
                          notes: `Quote for ${prItem.description}`,
                          status: pickRandom(['pending', 'approved', 'rejected']),
                        })
                        .select()
                        .single();

                      if (quote) {
                        await registerSeedData(supabase, 'quotes', quote.id, batchId);
                        stats.quotes++;

                        // Create quote approval log if quote is approved or rejected
                        if (quote.status === 'approved' || quote.status === 'rejected') {
                          const { data: approvalLog } = await supabase
                            .from('quote_approval_logs')
                            .insert({
                              quote_id: quote.id,
                              approved_by: user.id,
                              decision: quote.status === 'approved' ? 'approved' : 'rejected',
                              notes: quote.status === 'approved'
                                ? 'Best price and delivery time'
                                : 'Price too high compared to competitors',
                            })
                            .select()
                            .single();

                          if (approvalLog) {
                            await registerSeedData(supabase, 'quote_approval_logs', approvalLog.id, batchId);
                            stats.quote_approval_logs++;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Create purchase order
            const poNumber = `PO-${batchId.substring(0, 8)}-${poIdx + 1}`;
            const poDate = randomDateBetween(startDate, new Date());
            const expectedDelivery = new Date(poDate);
            expectedDelivery.setDate(new Date(expectedDelivery).getDate() + Math.floor(Math.random() * 30) + 15);

            let poStatus: string;
            let actualDelivery: string | null = null;

            if (scenario.scenario === 'completed') {
              poStatus = 'delivered';
              const actDel = new Date(expectedDelivery);
              actDel.setDate(actDel.getDate() + Math.floor(Math.random() * 10) - 5);
              actualDelivery = actDel.toISOString().split('T')[0];
            } else {
              poStatus = poIdx === 0 ? 'delivered' : pickRandom(['in_transit', 'ordered']);
              if (poStatus === 'delivered') {
                const actDel = new Date(expectedDelivery);
                actDel.setDate(actDel.getDate() + Math.floor(Math.random() * 5));
                actualDelivery = actDel.toISOString().split('T')[0];
              }
            }

            const poAmount = Math.floor(scenario.budget * (0.1 + Math.random() * 0.15));

            const { data: purchaseOrder } = await supabase
              .from('purchase_orders')
              .insert({
                purchase_order_number: poNumber,
                project_id: project.id,
                supplier_id: supplier.id,
                total_amount: poAmount,
                currency_id: 'BRL',
                payment_terms: pickRandom(['Net 30', 'Net 60', 'Net 90']),
                status: poStatus,
                expected_delivery_date: expectedDelivery.toISOString().split('T')[0],
                actual_delivery_date: actualDelivery,
                notes: `Purchase order for ${scenario.name}`,
              })
              .select()
              .single();

            if (purchaseOrder) {
              await registerSeedData(supabase, 'purchase_orders', purchaseOrder.id, batchId);
              stats.purchase_orders++;

              // Create delivery confirmation if delivered
              if (poStatus === 'delivered' && actualDelivery) {
                const { data: delivery } = await supabase
                  .from('delivery_confirmations')
                  .insert({
                    purchase_order_id: purchaseOrder.id,
                    delivery_date: actualDelivery,
                    received_by: user.user_metadata?.full_name || 'Site Manager',
                    notes: 'Delivery confirmed and inspected',
                  })
                  .select()
                  .single();

                if (delivery) {
                  await registerSeedData(supabase, 'delivery_confirmations', delivery.id, batchId);
                  stats.delivery_confirmations++;
                }

                // Create payment transaction
                const dueDate = new Date(actualDelivery);
                dueDate.setDate(dueDate.getDate() + 30);

                const { data: payment } = await supabase
                  .from('payment_transactions')
                  .insert({
                    purchase_order_id: purchaseOrder.id,
                    project_id: project.id,
                    amount: poAmount,
                    currency_id: 'BRL',
                    payment_terms: 'Net 30',
                    due_date: dueDate.toISOString().split('T')[0],
                    status: scenario.scenario === 'completed' ? 'completed' : pickRandom(['pending', 'scheduled', 'completed']),
                    payment_method: 'Bank Transfer',
                    created_by: user.id,
                  })
                  .select()
                  .single();

                if (payment) {
                  await registerSeedData(supabase, 'payment_transactions', payment.id, batchId);
                  stats.payment_transactions++;
                }
              }
            }
          }
        }

        // ==================== ARCHITECT MODULE DATA ====================

        console.log(`Adding architect module data for project ${i + 1}...`);

        // Create architect opportunities (sales pipeline)
        if (Math.random() > 0.5) {
          const { data: opportunity } = await supabase
            .from('architect_opportunities')
            .insert({
              client_id: client.id,
              project_name: `${scenario.name} - Opportunity`,
              estimated_value: scenario.budget * (0.8 + Math.random() * 0.4),
              probability: scenario.scenario === 'completed' ? 100 : Math.floor(Math.random() * 60) + 40,
              stage: scenario.scenario === 'completed' ? 'won' : pickRandom(['briefing', 'proposal_sent', 'negotiation']),
              expected_closing_date: randomDateBetween(startDate, endDate),
              notes: `Sales opportunity for ${scenario.name}`,
              created_by: user.id,
            })
            .select()
            .single();

          if (opportunity) {
            await registerSeedData(supabase, 'architect_opportunities', opportunity.id, batchId);
            stats.architect_opportunities++;
          }
        }

        // Create architect briefing
        if (scenario.completion > 10) {
          const { data: briefing } = await supabase
            .from('architect_briefings')
            .insert({
              project_id: project.id,
              client_objectives: `Create a ${scenario.type} space that is functional, beautiful, and sustainable`,
              style_preferences: pickRandom(['Modern', 'Contemporary', 'Traditional', 'Industrial', 'Minimalist']),
              budget_range_min: scenario.budget * 0.85,
              budget_range_max: scenario.budget * 1.15,
              area_m2: scenario.area,
              must_haves: 'Natural lighting, open spaces, sustainable materials',
              constraints: 'Budget constraints, local building codes, existing infrastructure',
              inspirations: JSON.stringify([
                { type: 'link', url: 'https://example.com/inspiration1', description: 'Modern design inspiration' },
                { type: 'link', url: 'https://example.com/inspiration2', description: 'Sustainable architecture example' },
              ]),
              notes: `Initial briefing for ${scenario.name}`,
              created_by: user.id,
            })
            .select()
            .single();

          if (briefing) {
            await registerSeedData(supabase, 'architect_briefings', briefing.id, batchId);
            stats.architect_briefings++;
          }
        }

        // Create architect meetings with comprehensive notes
        if (scenario.completion > 15) {
          const meetingCount = Math.floor(scenario.completion / 30) + 1;
          for (let mtg = 0; mtg < meetingCount; mtg++) {
            const meetingDate = randomDateBetween(startDate, new Date());
            const { data: meeting } = await supabase
              .from('architect_meetings')
              .insert({
                project_id: project.id,
                client_id: client.id,
                meeting_date: new Date(meetingDate).toISOString(),
                participants: JSON.stringify([
                  { name: user.user_metadata?.full_name || 'Project Manager', role: 'Project Manager' },
                  { name: client.name, role: 'Client' },
                  { name: 'Lead Architect', role: 'Architect' },
                ]),
                agenda: `1. Project progress review\n2. Design updates\n3. Budget discussion\n4. Timeline adjustments\n5. Next steps`,
                decisions: `- Approved design changes for ${pickRandom(['facade', 'layout', 'materials', 'finishes'])}\n- Confirmed budget allocation for ${pickRandom(['phase ' + (mtg + 1), 'materials', 'labor'])}\n- Agreed on delivery timeline`,
                next_actions: `- ${user.user_metadata?.full_name || 'PM'}: Update project plan\n- Architect: Finalize drawings\n- Client: Review and approve documents\n- Team: Schedule site visit`,
                created_by: user.id,
              })
              .select()
              .single();

            if (meeting) {
              await registerSeedData(supabase, 'architect_meetings', meeting.id, batchId);
              stats.architect_meetings++;
            }
          }
        }

        // Create architect site diary entries
        if (scenario.completion > 25) {
          const diaryCount = Math.floor(scenario.completion / 20);
          for (let d = 0; d < diaryCount; d++) {
            const diaryDate = randomDateBetween(startDate, new Date());
            const { data: diary } = await supabase
              .from('architect_site_diary')
              .insert({
                project_id: project.id,
                diary_date: diaryDate,
                weather: pickRandom(['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Clear']),
                progress_summary: `Day ${d + 1}: ${pickRandom([
                  'Foundation work progressing well',
                  'Structural framing completed',
                  'Mechanical installations ongoing',
                  'Interior finishes started',
                  'Exterior work advancing'
                ])}`,
                notes: `Crew of ${Math.floor(Math.random() * 15) + 5} workers on site. ${pickRandom([
                  'No issues reported',
                  'Minor delay due to material delivery',
                  'Inspection passed successfully',
                  'Quality check completed'
                ])}`,
                photos: JSON.stringify([
                  { url: `https://placehold.co/800x600/png?text=Site+Photo+${d + 1}-1`, caption: 'Progress overview' },
                  { url: `https://placehold.co/800x600/png?text=Site+Photo+${d + 1}-2`, caption: 'Detail work' },
                ]),
                checklist_status: JSON.stringify({
                  structure: Math.random() > 0.5,
                  finishes: Math.random() > 0.6,
                  installations: Math.random() > 0.4,
                }),
                created_by: user.id,
              })
              .select()
              .single();

            if (diary) {
              await registerSeedData(supabase, 'architect_site_diary', diary.id, batchId);
              stats.architect_site_diary++;
            }
          }
        }

        // Create architect tasks with comprehensive details
        if (scenario.completion < 100) {
          const taskTemplates = [
            { title: 'Review architectural drawings', priority: 'high', tags: ['design', 'review'] },
            { title: 'Coordinate with structural engineer', priority: 'high', tags: ['coordination', 'engineering'] },
            { title: 'Update material specifications', priority: 'medium', tags: ['materials', 'specs'] },
            { title: 'Schedule client presentation', priority: 'medium', tags: ['client', 'meeting'] },
            { title: 'Review contractor proposals', priority: 'high', tags: ['procurement', 'review'] },
            { title: 'Site inspection and documentation', priority: 'medium', tags: ['site', 'inspection'] },
            { title: 'Obtain building permits', priority: 'urgent', tags: ['permits', 'regulatory'] },
            { title: 'Finalize interior design package', priority: 'medium', tags: ['design', 'interior'] },
            { title: 'Review sustainability certifications', priority: 'low', tags: ['sustainability', 'compliance'] },
            { title: 'Update project timeline', priority: 'medium', tags: ['planning', 'schedule'] },
          ];

          const taskCount = Math.min(taskTemplates.length, Math.floor((100 - scenario.completion) / 15) + 2);
          const selectedTasks = taskTemplates.slice(0, taskCount);

          for (let t = 0; t < selectedTasks.length; t++) {
            const task = selectedTasks[t];
            const phase = createdPhases[Math.min(t, createdPhases.length - 1)];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 5);

            const { data: architectTask } = await supabase
              .from('architect_tasks')
              .insert({
                project_id: project.id,
                phase_id: phase?.id || null,
                title: task.title,
                description: `${task.title} for ${scenario.name}. Priority: ${task.priority}`,
                assignee_id: user.id,
                due_date: dueDate.toISOString().split('T')[0],
                priority: task.priority,
                status: Math.random() > 0.6 ? 'todo' : Math.random() > 0.5 ? 'in_progress' : 'completed',
                tags: JSON.stringify(task.tags),
                created_by: user.id,
              })
              .select()
              .single();

            if (architectTask) {
              await registerSeedData(supabase, 'architect_tasks', architectTask.id, batchId);
              stats.architect_tasks++;

              // Create task comments
              if (Math.random() > 0.5) {
                const { data: taskComment } = await supabase
                  .from('architect_task_comments')
                  .insert({
                    task_id: architectTask.id,
                    user_id: user.id,
                    comment: pickRandom([
                      'Started working on this task',
                      'Need to coordinate with the team',
                      'Waiting for client feedback',
                      'Almost complete, final review needed',
                      'Completed ahead of schedule'
                    ]),
                  })
                  .select()
                  .single();

                if (taskComment) {
                  await registerSeedData(supabase, 'architect_task_comments', taskComment.id, batchId);
                  stats.architect_task_comments++;
                }
              }
            }
          }
        }

        // Create site issues (problems/challenges)
        if (scenario.completion > 20 && Math.random() > 0.4) {
          const issueCount = scenario.scenario === 'delayed' || scenario.scenario === 'overrun' ? 2 : 1;
          for (let iss = 0; iss < issueCount; iss++) {
            const { data: siteIssue } = await supabase
              .from('site_issues')
              .insert({
                project_id: project.id,
                issue_title: pickRandom([
                  'Material delivery delay',
                  'Weather-related work stoppage',
                  'Design clarification needed',
                  'Equipment malfunction',
                  'Coordination issue with subcontractor'
                ]),
                issue_description: `Issue identified during ${pickRandom(['site inspection', 'daily review', 'quality check'])}. Requires attention.`,
                severity: pickRandom(['low', 'medium', 'high']),
                status: pickRandom(['open', 'in_progress', 'resolved']),
                reported_by: user.id,
                assigned_to: user.id,
              })
              .select()
              .single();

            if (siteIssue) {
              await registerSeedData(supabase, 'site_issues', siteIssue.id, batchId);
              stats.site_issues++;
            }
          }
        }

        // Create cost predictions (AI-based forecasting)
        if (scenario.completion > 30 && scenario.completion < 100) {
          const { data: costPred } = await supabase
            .from('cost_predictions')
            .insert({
              project_id: project.id,
              predicted_total_cost: scenario.budget * (0.95 + Math.random() * 0.20),
              confidence_score: Math.random() * 0.3 + 0.65,
              factors: JSON.stringify({
                material_costs: 'increasing',
                labor_availability: 'stable',
                weather_impact: 'moderate',
                schedule_variance: scenario.scenario === 'delayed' ? 'high' : 'low'
              }),
              prediction_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

          if (costPred) {
            await registerSeedData(supabase, 'cost_predictions', costPred.id, batchId);
            stats.cost_predictions++;
          }
        }
      }

      // ==================== PHASE 6: ROADMAP & SPRINTS ====================

      console.log('Phase 6: Creating roadmap and sprint data...');

      // Create sprints
      const sprintNames = ['Sprint 1 - Q1', 'Sprint 2 - Q2', 'Sprint 3 - Q3', 'Sprint 4 - Q4'];
      const createdSprints = [];

      for (let s = 0; s < sprintNames.length; s++) {
        const sprintStart = new Date();
        sprintStart.setMonth(sprintStart.getMonth() - (12 - s * 3));
        const sprintEnd = new Date(sprintStart);
        sprintEnd.setMonth(sprintEnd.getMonth() + 3);

        const { data: sprint } = await supabase
          .from('sprints')
          .insert({
            sprint_name: sprintNames[s],
            start_date: sprintStart.toISOString().split('T')[0],
            end_date: sprintEnd.toISOString().split('T')[0],
            status: s < 2 ? 'completed' : s === 2 ? 'active' : 'planned',
          })
          .select()
          .single();

        if (sprint) {
          createdSprints.push(sprint);
          await registerSeedData(supabase, 'sprints', sprint.id, batchId);
          stats.sprints++;
        }
      }

      // Create roadmap phases
      const roadmapPhaseNames = ['Planning', 'Development', 'Testing', 'Deployment'];
      const createdRoadmapPhases = [];

      for (const phaseName of roadmapPhaseNames) {
        // deno-lint-ignore no-explicit-any
        const { data: roadmapPhase }: { data: any } = await supabase
          .from('roadmap_phases')
          .insert({
            phase_name: phaseName,
            description: `${phaseName} phase for project roadmap`,
            sort_order: createdRoadmapPhases.length + 1,
          })
          .select()
          .single();

        if (roadmapPhase) {
          createdRoadmapPhases.push(roadmapPhase);
          await registerSeedData(supabase, 'roadmap_phases', roadmapPhase.id, batchId);
          stats.roadmap_phases++;
        }
      }

      // Create roadmap items
      if (createdSprints.length > 0) {
        const roadmapFeatures = [
          { title: 'User Authentication System', priority: 'high', status: 'completed' },
          { title: 'Project Dashboard', priority: 'high', status: 'in_progress' },
          { title: 'Mobile App Development', priority: 'medium', status: 'planned' },
          { title: 'Advanced Reporting', priority: 'medium', status: 'under_review' },
          { title: 'Integration with External Tools', priority: 'low', status: 'planned' },
        ];

        for (const feature of roadmapFeatures) {
          const sprint = pickRandom(createdSprints);
          const { data: roadmapItem } = await supabase
            .from('roadmap_items')
            .insert({
              title: feature.title,
              description: `Feature: ${feature.title}`,
              priority: feature.priority,
              status: feature.status,
              sprint_id: sprint.id,
              estimated_effort: Math.floor(Math.random() * 40) + 10,
              actual_effort: feature.status === 'completed' ? Math.floor(Math.random() * 40) + 10 : null,
            })
            .select()
            .single();

          if (roadmapItem) {
            await registerSeedData(supabase, 'roadmap_items', roadmapItem.id, batchId);
            stats.roadmap_items++;

            // Create roadmap item comment
            const { data: riComment } = await supabase
              .from('roadmap_item_comments')
              .insert({
                roadmap_item_id: roadmapItem.id,
                comment_text: `Great progress on ${feature.title}!`,
                author_name: user.user_metadata?.full_name || 'User',
                author_email: user.email,
              })
              .select()
              .single();

            if (riComment) {
              await registerSeedData(supabase, 'roadmap_item_comments', riComment.id, batchId);
              stats.roadmap_item_comments++;
            }
          }
        }
      }

      // Create roadmap tasks
      if (createdRoadmapPhases.length > 0) {
        for (const phase of createdRoadmapPhases.slice(0, 2)) {
          const { data: task } = await supabase
            .from('roadmap_tasks')
            .insert({
              phase_id: phase.id,
              task_name: `Task for ${phase.phase_name}`,
              description: `Important task in ${phase.phase_name} phase`,
              assigned_to: user.email,
              status: phase.phase_name === 'Planning' ? 'completed' : 'in_progress',
              due_date: randomDateBetween(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            })
            .select()
            .single();

          if (task) {
            await registerSeedData(supabase, 'roadmap_tasks', task.id, batchId);
            stats.roadmap_tasks++;
          }
        }
      }

      // ==================== PHASE 7: ESTIMATES ====================

      console.log('Phase 7: Creating estimates and additional data...');

      // Create estimates for clients
      if (createdClients.length > 0) {
        for (let e = 0; e < Math.min(2, createdClients.length); e++) {
          const client = createdClients[e];
          const { data: estimate } = await supabase
            .from('estimates')
            .insert({
              estimate_number: `EST-${batchId.substring(0, 8)}-${e + 1}`,
              client_id: client.id,
              project_name: `Estimate for ${client.name}`,
              total_amount: Math.floor(Math.random() * 500000) + 100000,
              currency: 'BRL',
              status: pickRandom(['draft', 'sent', 'approved', 'rejected']),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              created_by: user.id,
            })
            .select()
            .single();

          if (estimate) {
            await registerSeedData(supabase, 'estimates', estimate.id, batchId);
            stats.estimates++;
          }
        }
      }

      // ==================== COMPLETION ====================

      console.log('Demo data generation completed!');

      // Store version metadata
      const version = 'v3.0.0';
      const timestamp = new Date().toISOString();
      const totalRecords = Object.values(stats).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

      await registerSeedData(
        supabase,
        '_metadata',
        batchId,
        batchId,
        {
          version,
          timestamp,
          totalRecords,
          stats,
          description: 'Comprehensive demo data with 70+ tables including full procurement cycle, architect module, and financial tracking',
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Comprehensive demo data generated successfully!`,
          stats: {
            batchId,
            version,
            timestamp,
            ...stats,
            total: totalRecords,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Seed data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
