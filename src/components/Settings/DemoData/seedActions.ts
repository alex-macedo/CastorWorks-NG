/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/formatters';
import { ExecutionLogEntry } from '../ExecutionLog';
import {
  CLIENT_TEMPLATES,
  SUPPLIER_TEMPLATES,
  CONTRACTOR_TEMPLATES,
  PROJECT_TEMPLATES,
  PHASE_NAMES,
  ACTIVITY_TEMPLATES,
  MILESTONE_TEMPLATES,
  LABOR_TEMPLATES,
  EQUIPMENT_TEMPLATES,
  MATERIAL_TEMPLATES,
  SUBCONTRACTOR_TEMPLATES,
  MATERIAL_GROUP_TEMPLATES,
  BUDGET_CATEGORIES,
  CURRENCY_TEMPLATES,
  EXCHANGE_RATE_TEMPLATES,
  MEETING_TYPES,
  AGENDA_ITEM_TEMPLATES,
  DECISION_TEMPLATES,
  ACTION_ITEM_TEMPLATES,
  DOCUMENT_TYPE_TEMPLATES,
  TEAM_TITLES,
  TEAM_ROLES,
  CLIENT_PORTAL_TASK_TEMPLATES,
  SCHEDULE_EVENT_TYPES,
  OPPORTUNITY_STAGES,
  RESOURCE_TYPES,
  CREW_NAMES,
  PROJECT_TYPES,
  getDemoDate,
  formatDateOnly,
  formatTimeOnly,
  TRACKED_TABLES,
  SEEDED_CLIENT_NAMES,
  SEEDED_SUPPLIER_NAMES,
  SEEDED_PROJECT_NAMES,
} from '@/config';

export interface SeedConfig {
  includeExpenses: boolean;
  includeMaterials: boolean;
  includeDocuments: boolean;
}

export type LogHandler = (type: ExecutionLogEntry['type'], message: string, phase?: string) => void;

type SeedRegistryRecord = {
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  seed_batch_id?: string | null;
};

export function createDemoDataActions(addLog: LogHandler, seedConfig: SeedConfig) {
  // Utility: check if a table has a column; returns false on missing table/column
  const hasColumn = async (table: string, column: string) => {
    try {
      const { error } = await (supabase as any)
        .from(table)
        .select(column)
        .limit(1);
      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.message.includes('column')) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // Batch delete helper to handle large ID arrays
  const batchDeleteRecords = async (table: string, ids: string[], batchSize = 100) => {
    let totalDeleted = 0;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const { error, count } = await (supabase as any)
        .from(table)
        .delete()
        .in('id', batch);

      if (error) {
        throw error;
      }

      if (typeof count === 'number') {
        totalDeleted += count;
      } else {
        totalDeleted += batch.length;
      }
    }
    return totalDeleted;
  };

  // RLS-aware insert helper that gracefully handles RLS policy violations
  const insertWithRLSHandling = async (table: string, rows: any[], logHandler?: (msg: string) => void) => {
    try {
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) {
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          if (logHandler) logHandler(`RLS policy prevents insertion into ${table} (expected for some seeded data)`);
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (err.message?.includes('row-level security') || err.message?.includes('RLS')) {
        if (logHandler) logHandler(`RLS policy prevents insertion into ${table} (expected for some seeded data)`);
        return [];
      }
      throw err;
    }
  };

  // Function to fetch detailed table statistics
    const fetchDetailedStats = async () => {
      // Use imported table configuration
      const tables = TRACKED_TABLES;

      const byTable: Record<string, { count: number; description?: string }> = {};
      let totalRecords = 0;

      // Get seed data registry to identify seeded records
      const { data: registryData } = await supabase
        .from('seed_data_registry')
        .select('entity_type, entity_id');

      if (!registryData) return null;

      const registry = registryData as Pick<SeedRegistryRecord, 'entity_type' | 'entity_id'>[];

      // Group by entity type
      const seedRecordsByType = registry.reduce((acc, record) => {
        if (record.entity_type === '_metadata') return acc;
        if (!acc[record.entity_type]) {
          acc[record.entity_type] = [];
        }
        acc[record.entity_type].push(record.entity_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Count records for each table
      for (const table of tables) {
        const seedIds = seedRecordsByType[table.name] || [];
        if (seedIds.length > 0) {
          byTable[table.name] = {
            count: seedIds.length,
            description: table.label,
          };
          totalRecords += seedIds.length;
        }
      }

      // Get version info
      const { data: versionRows } = await supabase
        .from('seed_data_registry')
        .select('metadata, created_at')
        .eq('entity_type', '_metadata')
        .order('created_at', { ascending: false })
        .limit(1);


      const versionData = (versionRows?.[0] as SeedRegistryRecord | undefined) ?? null;
      const metadata = versionData?.metadata;
      const metadataRecord = metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>)
        : null;

      return {
        totalRecords,
        version: typeof metadataRecord?.version === 'string' ? metadataRecord.version : 'v3.0.0',
        timestamp: typeof metadataRecord?.timestamp === 'string'
          ? metadataRecord.timestamp
          : versionData?.created_at || new Date().toISOString(),
        byTable,
      };
    };

    // Helper function to register seeded records
    const registerSeedRecord = async (entityType: string, entityId: string, batchId: string) => {
      await supabase.from('seed_data_registry').insert({
        entity_type: entityType,
        entity_id: entityId,
        seed_batch_id: batchId,
      });
    };

    // Helper function to clear existing seed data (preserving "Daniel Lima" project)
    const clearSeedData = async () => {
      addLog('info', 'Clearing existing seed data (preserving "Daniel Lima" project)...');

      // Find the "Daniel Lima" project to protect it and all related data
      const { data: danielLimaProject } = await supabase
        .from('projects')
        .select('id, client_id')
        .eq('name', 'Daniel Lima')
        .maybeSingle();

      const protectedIds: string[] = [];

      if (danielLimaProject) {
        protectedIds.push(danielLimaProject.id);
        addLog('info', `Found "Daniel Lima" project (ID: ${danielLimaProject.id}), preserving all related data...`);

        // Protect the client associated with Daniel Lima project
        if (danielLimaProject.client_id) {
          protectedIds.push(danielLimaProject.client_id);
          addLog('info', `Protected client (ID: ${danielLimaProject.client_id}) associated with Daniel Lima project`);
        }

        // Get all related entities for Daniel Lima project to protect them
        const relatedQueries = [
          supabase.from('project_phases').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_activities').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_milestones').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_resources').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_materials').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_budget_items').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_financial_entries').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_purchase_requests').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('purchase_orders').select('id, supplier_id').eq('project_id', danielLimaProject.id),
          supabase.from('payment_transactions').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('delivery_confirmations').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('time_logs').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('daily_logs').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_photos').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('project_documents').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('site_issues').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('quality_inspections').select('id').eq('project_id', danielLimaProject.id),
          supabase.from('cost_predictions').select('id').eq('project_id', danielLimaProject.id),
        ];

        // Execute queries and collect protected IDs
        for (const query of relatedQueries) {
          try {
            const { data } = await query;
            if (data) {
              data.forEach((item: any) => {
                if (item.id && !protectedIds.includes(item.id)) {
                  protectedIds.push(item.id);
                }
                // Also protect suppliers from purchase orders
                if (item.supplier_id && !protectedIds.includes(item.supplier_id)) {
                  protectedIds.push(item.supplier_id);
                }
              });
            }
          } catch (error) {
            // Ignore errors for tables that might not exist
          }
        }

        addLog('info', `Protected ${protectedIds.length} entities related to "Daniel Lima" project`);
      } else {
        addLog('info', 'Could not find "Daniel Lima" project - will delete all seed data');
      }

      // Call comprehensive RPC function to clear all seed data
      try {
        addLog('info', 'Calling comprehensive seed data cleanup function...');
        const { data: deletedCount, error } = await supabase.rpc('clear_seed_data_records', {
          proj_ids: protectedIds,
        });

        if (error) {
          addLog('error', `Comprehensive seed cleanup failed: ${error.message}`);
          throw error;
        }

        addLog('info', `Comprehensive seed cleanup removed ${deletedCount || 0} records`);

        // Verification: Check that seed data was cleared
        const { data: allRegistry } = await supabase
          .from('seed_data_registry')
          .select('entity_type, entity_id')
          .neq('entity_type', '_metadata');

        const protectedSet = new Set(protectedIds);
        const remainingRegistry = (allRegistry || []).filter(
          (record: any) => !protectedSet.has(record.entity_id)
        );

        if (remainingRegistry.length > 0) {
          addLog('warning', `Found ${remainingRegistry.length} remaining seed records in registry after cleanup`);
          // Group by entity type for reporting
          const byType = remainingRegistry.reduce<Record<string, number>>((acc, record: any) => {
            acc[record.entity_type] = (acc[record.entity_type] || 0) + 1;
            return acc;
          }, {});
          for (const [entityType, count] of Object.entries(byType)) {
            addLog('warning', `  - ${entityType}: ${count} records`);
          }
        } else {
          addLog('success', 'Verification passed: All seed data cleared (except protected entities)');
        }

        // Cleanup demo users from Auth
        try {
          addLog('info', 'Cleaning up demo user accounts...');
          const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_demo_users', {
            emails: [
              'camila@example.com',
              'rafael@example.com',
              'lara@example.com'
            ]
          });

          if (deleteError) {
            addLog('error', `Failed to delete demo users: ${deleteError.message}`);
          } else if (deleteResult?.deleted_count) {
            addLog('info', `Deleted ${deleteResult.deleted_count} demo user accounts`);
          }
        } catch (error: any) {
          addLog('error', `Error calling delete_demo_users RPC: ${error.message}`);
        }

        addLog('success', `Cleared seed data (preserved "Daniel Lima" project and ${protectedIds.length} related entities)`);
      } catch (err: any) {
        addLog('error', `Comprehensive seed cleanup threw: ${err.message || String(err)}`);
        throw err;
      }
    };

    // Step 1: Seed currencies and exchange rates
    const seedCurrencies = async (batchId: string) => {
      addLog('phase', 'Seeding currencies and exchange rates...', 'Step 1');
      const currencies = [
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', is_active: true },
        { code: 'USD', name: 'US Dollar', symbol: '$', is_active: true },
        { code: 'EUR', name: 'Euro', symbol: '€', is_active: true },
      ];

      const { data: existingCurrencies } = await supabase.from('currencies').select('code');
      const existingCodes = new Set(existingCurrencies?.map(c => c.code) || []);

      for (const currency of currencies) {
        if (!existingCodes.has(currency.code)) {
          const { data, error } = await supabase.from('currencies').insert(currency).select().single();
          if (error) {
            addLog('error', `Failed to seed currency ${currency.code}: ${error.message}`);
          } else if (data) {
            await registerSeedRecord('currencies', data.id, batchId);
          }
        }
      }

      // Seed exchange rates (30 days of historical data)
      // Check for existing rates to avoid duplicate key violations
      const today = new Date();
      const rates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        rates.push(
          { from_currency: 'USD', to_currency: 'BRL', rate: 5.0 + Math.random() * 0.5, rate_date: dateStr },
          { from_currency: 'EUR', to_currency: 'BRL', rate: 5.5 + Math.random() * 0.5, rate_date: dateStr },
          { from_currency: 'EUR', to_currency: 'USD', rate: 1.1 + Math.random() * 0.1, rate_date: dateStr },
        );
      }

      // Check for existing exchange rates to avoid duplicates
      const { data: existingRates } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency, rate_date');

      const existingRateKeys = new Set(
        (existingRates || []).map(r => `${r.from_currency}-${r.to_currency}-${r.rate_date}`)
      );

      const newRates = rates.filter(rate => {
        const key = `${rate.from_currency}-${rate.to_currency}-${rate.rate_date}`;
        return !existingRateKeys.has(key);
      });

      if (newRates.length > 0) {
        const { data: insertedRates, error: ratesError } = await supabase
          .from('exchange_rates')
          .insert(newRates)
          .select();

        if (ratesError) {
          throw new Error(`Failed to seed exchange rates: ${ratesError.message}`);
        }

        // Register seeded exchange rates
        for (const rate of insertedRates || []) {
          await registerSeedRecord('exchange_rates', rate.id, batchId);
        }

        addLog('success', `Seeded ${insertedRates?.length || 0} exchange rate records (${rates.length - newRates.length} already existed)`);
      } else {
        addLog('info', `All ${rates.length} exchange rate records already exist`);
      }

      return currencies;
    };

    // Step 2: Seed clients
    const seedClients = async (batchId: string) => {
      addLog('phase', 'Seeding clients...', 'Step 2');
      const clients = CLIENT_TEMPLATES;

      // Use RPC function to bypass RLS (SECURITY DEFINER)
      const { data, error } = await supabase.rpc('insert_clients_for_seeding', {
        p_clients: clients as any,
      });

      if (error) {
        throw new Error(`Failed to seed clients: ${error.message}`);
      }

      for (const client of data || []) {
        await registerSeedRecord('clients', client.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} clients`);
      return data || [];
    };

    // Step 3: Seed suppliers
    const seedSuppliers = async (batchId: string) => {
      addLog('phase', 'Seeding suppliers...', 'Step 3');
      const suppliersToSeed = SUPPLIER_TEMPLATES;

      // Check for existing suppliers by name or email to avoid duplicates
      const supplierNames = suppliersToSeed.map(s => s.name);
      const supplierEmails = suppliersToSeed.map(s => s.contact_email).filter(Boolean);

      // Query for existing suppliers by name
      const { data: existingByName } = await supabase
        .from('suppliers')
        .select('id, name, contact_email')
        .in('name', supplierNames);

      // Query for existing suppliers by email (if any emails provided)
      const { data: existingByEmail } = supplierEmails.length > 0
        ? await supabase
            .from('suppliers')
            .select('id, name, contact_email')
            .in('contact_email', supplierEmails)
        : { data: null };

      // Combine and deduplicate existing suppliers
      const existingSuppliersMap = new Map<string, any>();
      [...(existingByName || []), ...(existingByEmail || [])].forEach(s => {
        if (s.id) existingSuppliersMap.set(s.id, s);
      });
      const existingSuppliers = Array.from(existingSuppliersMap.values());

      const existingNames = new Set(existingSuppliers.map(s => s.name));
      const existingEmails = new Set(existingSuppliers.map(s => s.contact_email).filter(Boolean));

      // Filter out suppliers that already exist
      const newSuppliers = suppliersToSeed.filter(s => 
        !existingNames.has(s.name) && !existingEmails.has(s.contact_email)
      );

      let insertedSuppliers: any[] = [];

      if (newSuppliers.length > 0) {
        const { data, error } = await supabase.from('suppliers').insert(newSuppliers).select();
        if (error) {
          throw new Error(`Failed to seed suppliers: ${error.message}`);
        }
        insertedSuppliers = data || [];
        addLog('info', `Inserted ${insertedSuppliers.length} new suppliers, skipped ${suppliersToSeed.length - newSuppliers.length} existing suppliers`);
      } else {
        addLog('info', 'All suppliers already exist, skipping insertion');
      }

      // Register all suppliers (both new and existing) in seed registry
      const allSuppliers = [...insertedSuppliers, ...(existingSuppliers || [])];
      for (const supplier of allSuppliers) {
        await registerSeedRecord('suppliers', supplier.id, batchId);
      }

      addLog('success', `Seeded ${insertedSuppliers.length} new suppliers, total ${allSuppliers.length} suppliers available`);
      return allSuppliers;
    };

    // Step 3.5: Seed contractors
    const seedContractors = async (batchId: string) => {
      addLog('phase', 'Seeding contractors...', 'Step 3.5');

      // Check if contractors table exists by attempting a simple query
      const { error: tableCheckError } = await (supabase as any)
        .from('contractors')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        // Table doesn't exist or is not accessible
        if (tableCheckError.message.includes('does not exist') || tableCheckError.message.includes('schema cache')) {
          addLog('info', 'Contractors table does not exist. Skipping contractors seeding. Please run the migration: 2025-11-08_add_contractors_table.sql');
          return [];
        }
        // Other error, re-throw
        throw new Error(`Failed to check contractors table: ${tableCheckError.message}`);
      }

      const contractors = [
        { 
          name: 'João Silva', 
          company: 'Silva Construções', 
          contact_name: 'João Silva',
          email: 'joao@silvaconstrucoes.com.br', 
          phone: '+55 11 98765-4321',
          address: 'Rua das Obras, 123',
          city: 'São Paulo',
          state: 'SP',
          postal_code: '01310-100',
          country: 'Brasil',
          tax_id: '12.345.678/0001-90',
          license_number: 'CREA-SP 123456',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'Specializes in electrical installations'
        },
        { 
          name: 'Maria Santos', 
          company: 'Santos Hidráulica', 
          contact_name: 'Maria Santos',
          email: 'maria@santoshidraulica.com.br', 
          phone: '+55 21 91234-5678',
          address: 'Av. dos Trabalhadores, 456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          postal_code: '20040-020',
          country: 'Brasil',
          tax_id: '23.456.789/0001-01',
          license_number: 'CREA-RJ 234567',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'Expert in plumbing and water systems'
        },
        { 
          name: 'Carlos Oliveira', 
          company: 'Oliveira Acabamentos', 
          contact_name: 'Carlos Oliveira',
          email: 'carlos@oliveiraacabamentos.com.br', 
          phone: '+55 31 99876-5432',
          address: 'Rua dos Artesãos, 789',
          city: 'Belo Horizonte',
          state: 'MG',
          postal_code: '30130-010',
          country: 'Brasil',
          tax_id: '34.567.890/0001-12',
          license_number: 'CREA-MG 345678',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'High-quality finishing work'
        },
        { 
          name: 'Ana Costa', 
          company: 'Costa Estruturas', 
          contact_name: 'Ana Costa',
          email: 'ana@costaestruturas.com.br', 
          phone: '+55 41 98765-4321',
          address: 'Av. Estrutural, 321',
          city: 'Curitiba',
          state: 'PR',
          postal_code: '80020-000',
          country: 'Brasil',
          tax_id: '45.678.901/0001-23',
          license_number: 'CREA-PR 456789',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'Structural engineering and concrete work'
        },
        { 
          name: 'Roberto Alves', 
          company: 'Alves Telhados', 
          contact_name: 'Roberto Alves',
          email: 'roberto@alvestelhados.com.br', 
          phone: '+55 48 91234-5678',
          address: 'Rua dos Telhados, 654',
          city: 'Florianópolis',
          state: 'SC',
          postal_code: '88015-200',
          country: 'Brasil',
          tax_id: '56.789.012/0001-34',
          license_number: 'CREA-SC 567890',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'Roofing and waterproofing specialist'
        },
        { 
          name: 'Fernanda Lima', 
          company: 'Lima Pinturas', 
          contact_name: 'Fernanda Lima',
          email: 'fernanda@limapinturas.com.br', 
          phone: '+55 85 99876-5432',
          address: 'Av. das Cores, 987',
          city: 'Fortaleza',
          state: 'CE',
          postal_code: '60060-100',
          country: 'Brasil',
          tax_id: '67.890.123/0001-45',
          license_number: 'CREA-CE 678901',
          resource_type: 'subcontractor',
          is_active: true,
          notes: 'Professional painting and coatings'
        },
      ];

      const { data, error } = await (supabase as any).from('contractors').insert(contractors).select();
      if (error) {
        throw new Error(`Failed to seed contractors: ${error.message}`);
      }

      for (const contractor of data || []) {
        await registerSeedRecord('contractors', contractor.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} contractors`);
      return data || [];
    };

    // Step 4: Seed projects
    const seedProjects = async (clients: any[], batchId: string) => {
      addLog('phase', 'Seeding projects...', 'Step 4');
      // NOTE: These are regular projects (owner_id = NULL) for project managers/admins
      // Architect-owned projects are created separately in architectSeedActions.ts
      const projectTemplates = [
        { name: 'Complexo Residencial - Fase 1', type: 'residential', status: 'active', completion: 0.25 },
        { name: 'Edifício Comercial Centro', type: 'commercial', status: 'active', completion: 0.45 },
      ];

      const projects = projectTemplates.map((template, idx) => {
        const client = clients[idx % clients.length];

        // Special assignment for Alex Macedo (CLI) to get Residencial Familia Macedo project
        let assignedClient = client;
        const assignedTemplate = template;
        if (template.name === 'Residencial Familia Macedo') {
          // Find Alex Macedo (CLI) client
          const alexMacedoClient = clients.find(c => c.name === 'Alex Macedo (CLI)');
          if (alexMacedoClient) {
            assignedClient = alexMacedoClient;
          }
        }

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 12 + Math.floor(Math.random() * 12));

        return {
          name: assignedTemplate.name,
          client_id: assignedClient.id,
          type: assignedTemplate.type,
          status: assignedTemplate.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          budget_total: (5000000 + Math.random() * 10000000) / 100,
          location: assignedClient.location,
          description: `Projeto completo de construção ${assignedTemplate.type.toLowerCase()}`,
        };
      });

      const { data, error } = await supabase.from('projects').insert(projects).select();
      if (error) {
        throw new Error(`Failed to seed projects: ${error.message}`);
      }

      for (const project of data || []) {
        await registerSeedRecord('projects', project.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} projects`);
      return data || [];
    };

    // Step 5: Seed project phases
    const seedProjectPhases = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project phases...', 'Step 5');
      const phaseNames = ['Fundação', 'Estrutura', 'Vedação', 'Instalações', 'Interiores', 'Acabamento', 'Paisagismo'];
      const phases = [];

      for (const project of projects) {
        const numPhases = 4 + Math.floor(Math.random() * 3);
        const startDate = new Date(project.start_date);

        for (let i = 0; i < numPhases && i < phaseNames.length; i++) {
          const phaseStart = new Date(startDate);
          phaseStart.setMonth(phaseStart.getMonth() + i * 2);
          const phaseEnd = new Date(phaseStart);
          phaseEnd.setMonth(phaseEnd.getMonth() + 2);

          const progress = i === 0 ? 100 : i === numPhases - 1 ? 0 : Math.floor(Math.random() * 100);
          const status = progress === 100 ? 'completed' : progress === 0 ? 'pending' : 'in_progress';
          const budgetAllocated = (project.budget_total / numPhases) * (0.8 + Math.random() * 0.4);
          const budgetSpent = budgetAllocated * (progress / 100);

          phases.push({
            project_id: project.id,
            phase_name: phaseNames[i],
            start_date: phaseStart.toISOString().split('T')[0],
            end_date: phaseEnd.toISOString().split('T')[0],
            progress_percentage: progress,
            status,
            budget_allocated: budgetAllocated,
            budget_spent: budgetSpent,
            type: 'schedule' as const, // Demo phases have dates, so they're schedule phases
          });
        }
      }

      const { data, error } = await supabase.from('project_phases').insert(phases).select();
      if (error) {
        throw new Error(`Failed to seed project phases: ${error.message}`);
      }

      for (const phase of data || []) {
        await registerSeedRecord('project_phases', phase.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project phases`);
      return data || [];
    };

    // Step 6: Seed project activities
    const seedProjectActivities = async (phases: any[], batchId: string) => {
      addLog('phase', 'Seeding project activities...', 'Step 6');
      const activityTemplates = [
        'Escavação', 'Concretagem', 'Instalação de Estrutura Metálica', 'Construção de Paredes',
        'Cobertura', 'Instalação Elétrica', 'Instalação Hidráulica', 'Instalação de Ar Condicionado',
        'Drywall', 'Pintura', 'Pisos', 'Marcenaria', 'Paisagismo', 'Vistoria Final',
      ];

      const activities = [];
      const phasesByProject = phases.reduce((acc, phase) => {
        if (!acc[phase.project_id]) acc[phase.project_id] = [];
        acc[phase.project_id].push(phase);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [projectId, projectPhases] of Object.entries(phasesByProject)) {
        let sequenceCounter = 1;
        for (const phase of projectPhases as any[]) {
          const numActivities = 3 + Math.floor(Math.random() * 4);
          const selectedActivities = activityTemplates
            .sort(() => Math.random() - 0.5)
            .slice(0, numActivities);

          for (const activityName of selectedActivities) {
            const startDate = new Date(phase.start_date);
            const endDate = new Date(phase.end_date);
            const activityStart = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
            const activityEnd = new Date(activityStart);
            activityEnd.setDate(activityEnd.getDate() + 5 + Math.floor(Math.random() * 10));

            const daysForActivity = Math.ceil((activityEnd.getTime() - activityStart.getTime()) / (1000 * 60 * 60 * 24));
            const completionPercentage = phase.status === 'completed' ? 100 : phase.status === 'pending' ? 0 : Math.floor(Math.random() * 100);
            const completionDate = completionPercentage === 100 ? activityEnd.toISOString().split('T')[0] : null;

            activities.push({
              project_id: projectId,
              phase_id: phase.id,
              sequence: sequenceCounter++,
              name: activityName,
              start_date: activityStart.toISOString().split('T')[0],
              end_date: activityEnd.toISOString().split('T')[0],
              completion_date: completionDate,
              completion_percentage: completionPercentage,
              days_for_activity: daysForActivity,
            });
          }
        }
      }

      const { data, error } = await supabase.from('project_activities').insert(activities).select();
      if (error) {
        throw new Error(`Failed to seed project activities: ${error.message}`);
      }

      for (const activity of data || []) {
        await registerSeedRecord('project_activities', activity.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project activities`);
      return data || [];
    };

    // Step 7: Seed project milestones
    const seedProjectMilestones = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project milestones...', 'Step 7');
      const milestones = [];

      for (const project of projects) {
        const milestoneTemplates = [
          { name: 'Project Kickoff', percentage: 0 },
          { name: 'Foundation Complete', percentage: 15 },
          { name: 'Structure Complete', percentage: 40 },
          { name: 'Enclosure Complete', percentage: 60 },
          { name: 'MEP Complete', percentage: 75 },
          { name: 'Interior Complete', percentage: 90 },
          { name: 'Project Completion', percentage: 100 },
        ];

        for (const template of milestoneTemplates) {
          const milestoneDate = new Date(project.start_date);
          const projectDuration = new Date(project.end_date).getTime() - new Date(project.start_date).getTime();
          milestoneDate.setTime(new Date(project.start_date).getTime() + (projectDuration * template.percentage / 100));

          milestones.push({
            project_id: project.id,
            name: template.name,
            due_date: milestoneDate.toISOString().split('T')[0],
            achieved_date: template.percentage <= 50 ? milestoneDate.toISOString().split('T')[0] : null,
            status: template.percentage <= 50 ? 'achieved' : 'pending',
            description: `Marco: ${template.name}`,
          });
        }
      }

      const { data, error } = await supabase.from('project_milestones').insert(milestones).select();
      if (error) {
        throw new Error(`Failed to seed project milestones: ${error.message}`);
      }

      for (const milestone of data || []) {
        await registerSeedRecord('project_milestones', milestone.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project milestones`);
      return data || [];
    };

    // Step 8: Seed project resources
    const seedProjectResources = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project resources...', 'Step 8');
      const resourceTypes = ['labor', 'equipment', 'material', 'subcontractor'];
      const resources = [];

      const laborNames = ['Arquiteto Sênior', 'Arquiteto Júnior', 'Desenhista', 'Gerente de Projeto', 'Supervisor de Obra'];
      const equipmentNames = ['Escavadeira', 'Guindaste', 'Betoneira', 'Andaime', 'Ferramentas Elétricas'];
      const materialNames = ['Ferro para Concreto', 'Concreto', 'Tijolos', 'Cimento', 'Areia'];
      const subcontractorNames = ['Contratada de Elétrica', 'Contratada de Hidráulica', 'Contratada de Ar Condicionado', 'Contratada de Cobertura'];

      for (const project of projects) {
        // Labor resources
        const numLabor = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numLabor; i++) {
          resources.push({
            project_id: project.id,
            resource_type: 'labor',
            resource_name: laborNames[Math.floor(Math.random() * laborNames.length)],
            availability_percentage: 80 + Math.random() * 20,
            hourly_rate: (50 + Math.random() * 150) / 100,
            daily_rate: null,
            unit_cost: null,
            max_units_per_day: 8,
          });
        }

        // Equipment resources
        const numEquipment = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numEquipment; i++) {
          resources.push({
            project_id: project.id,
            resource_type: 'equipment',
            resource_name: equipmentNames[Math.floor(Math.random() * equipmentNames.length)],
            availability_percentage: 90 + Math.random() * 10,
            hourly_rate: null,
            daily_rate: (200 + Math.random() * 800) / 100,
            unit_cost: null,
            max_units_per_day: 1,
          });
        }

        // Material resources
        const numMaterials = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numMaterials; i++) {
          resources.push({
            project_id: project.id,
            resource_type: 'material',
            resource_name: materialNames[Math.floor(Math.random() * materialNames.length)],
            availability_percentage: 100,
            hourly_rate: null,
            daily_rate: null,
            unit_cost: (10 + Math.random() * 100) / 100,
            max_units_per_day: 1000,
          });
        }

        // Subcontractor resources
        const numSubcontractors = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numSubcontractors; i++) {
          resources.push({
            project_id: project.id,
            resource_type: 'subcontractor',
            resource_name: subcontractorNames[Math.floor(Math.random() * subcontractorNames.length)],
            availability_percentage: 75 + Math.random() * 25,
            hourly_rate: null,
            daily_rate: null,
            unit_cost: (500 + Math.random() * 2000) / 100,
            max_units_per_day: 1,
          });
        }
      }

      const { data, error } = await supabase.from('project_resources').insert(resources).select();
      if (error) {
        throw new Error(`Failed to seed project resources: ${error.message}`);
      }

      for (const resource of data || []) {
        await registerSeedRecord('project_resources', resource.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project resources`);
      return data || [];
    };

    // Step 9: Seed project materials
    const seedProjectMaterials = async (projects: any[], batchId: string) => {
      if (!seedConfig.includeMaterials) {
        addLog('info', 'Skipping project materials (disabled in config)');
        return [];
      }

      addLog('phase', 'Seeding project materials...', 'Step 9');
      const materialGroups = [
        { group_name: 'Concreto', description: 'Concreto usinado', unit: 'm³' },
        { group_name: 'Ferro para Concreto', description: 'Aço de armadura', unit: 'kg' },
        { group_name: 'Tijolos', description: 'Tijolos cerâmicos', unit: 'unidades' },
        { group_name: 'Cimento', description: 'Cimento Portland', unit: 'sacos' },
        { group_name: 'Areia', description: 'Areia de construção', unit: 'm³' },
        { group_name: 'Brita', description: 'Pedra britada', unit: 'm³' },
      ];

      const materials = [];

      for (const project of projects) {
        for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
          const material = materialGroups[Math.floor(Math.random() * materialGroups.length)];
          const quantity = 10 + Math.random() * 100;
          const pricePerUnit = (20 + Math.random() * 200) / 100;

          materials.push({
            project_id: project.id,
            group_name: material.group_name,
            description: material.description,
            quantity,
            unit: material.unit,
            price_per_unit: pricePerUnit,
            freight_percentage: 5 + Math.random() * 10,
          });
        }
      }

      const { data, error } = await supabase.from('project_materials').insert(materials).select();
      if (error) {
        throw new Error(`Failed to seed project materials: ${error.message}`);
      }

      for (const material of data || []) {
        await registerSeedRecord('project_materials', material.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project materials`);
      return data || [];
    };

    // Step 10: Seed project budget items
    const seedProjectBudgetItems = async (projects: any[], phases: any[], batchId: string) => {
      addLog('phase', 'Seeding project budget items...', 'Step 10');
      const categories = ['Mão de Obra', 'Materiais', 'Equipamentos', 'Subcontratados', 'Despesas Gerais', 'Impostos e Taxas', 'Contingência'];
      const budgetItems = [];

      // Category allocation percentages for realistic budget distribution
      const categoryPercentages: Record<string, number> = {
        'Mão de Obra': 0.35,
        'Materiais': 0.25,
        'Equipamentos': 0.15,
        'Subcontratados': 0.10,
        'Despesas Gerais': 0.08,
        'Impostos e Taxas': 0.05,
        'Contingência': 0.02,
      };

      const phasesByProject = phases.reduce((acc, phase) => {
        if (!acc[phase.project_id]) acc[phase.project_id] = [];
        acc[phase.project_id].push(phase);
        return acc;
      }, {} as Record<string, any[]>);

      for (const project of projects) {
        const projectPhases = phasesByProject[project.id] || [];

        // Budget items per phase - More comprehensive
        for (const phase of projectPhases) {
          // All categories per phase
          for (const category of categories) {
            const budgetedAmount = (phase.budget_allocated / categories.length) * (0.8 + Math.random() * 0.4);
            // Actual amount varies: some over budget, some under budget, some on target
            const varianceFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3 (70% to 130% of budgeted)
            const progressFactor = phase.progress_percentage / 100;
            const actualAmount = budgetedAmount * progressFactor * varianceFactor;

            budgetItems.push({
              project_id: project.id,
              phase_id: phase.id,
              category,
              description: `Orçamento de ${category} para a fase ${phase.phase_name}`,
              budgeted_amount: Math.round(budgetedAmount * 100) / 100,
              actual_amount: Math.round(actualAmount * 100) / 100,
            });
          }
        }

        // Overall project budget items (no phase) - More comprehensive
        // Generate items for all categories, not just first 3
        for (const category of categories) {
          const percentage = categoryPercentages[category] || 0.1;
          const budgetedAmount = project.budget_total * percentage * (0.9 + Math.random() * 0.2);

          // Actual amount varies based on project progress and variance
          const projectProgress = projectPhases.length > 0 
            ? projectPhases.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projectPhases.length / 100
            : 0.5;
          const varianceFactor = 0.75 + Math.random() * 0.5; // 75% to 125% variance
          const actualAmount = budgetedAmount * projectProgress * varianceFactor;

          budgetItems.push({
            project_id: project.id,
            phase_id: null,
            category,
            description: `Orçamento geral de ${category} para ${project.name}`,
            budgeted_amount: Math.round(budgetedAmount * 100) / 100,
            actual_amount: Math.round(actualAmount * 100) / 100,
          });
        }

        // Additional detailed budget items for major categories (Labor, Materials)
        const detailedCategories = ['Mão de Obra', 'Materiais'];
        for (const category of detailedCategories) {
          // Add sub-items for more granular budget control
          const subItems = category === 'Mão de Obra' 
            ? ['Operários', 'Supervisores', 'Engenheiros', 'Arquitetos']
            : ['Concreto', 'Aço', 'Tijolos', 'Cimento', 'Areia', 'Brita'];

          for (const subItem of subItems) {
            const baseAmount = project.budget_total * (categoryPercentages[category] || 0.1) / subItems.length;
            const budgetedAmount = baseAmount * (0.8 + Math.random() * 0.4);
            const projectProgress = projectPhases.length > 0 
              ? projectPhases.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projectPhases.length / 100
              : 0.5;
            const actualAmount = budgetedAmount * projectProgress * (0.8 + Math.random() * 0.4);

            budgetItems.push({
              project_id: project.id,
              phase_id: null,
              category: `${category} - ${subItem}`,
              description: `Orçamento de ${subItem} na categoria ${category}`,
              budgeted_amount: Math.round(budgetedAmount * 100) / 100,
              actual_amount: Math.round(actualAmount * 100) / 100,
            });
          }
        }
      }

      if (budgetItems.length === 0) {
        addLog('info', 'No budget items to seed');
        return [];
      }

      const { data, error } = await supabase.from('project_budget_items').insert(budgetItems).select();
      if (error) {
        throw new Error(`Failed to seed project budget items: ${error.message}`);
      }

      for (const item of data || []) {
        await registerSeedRecord('project_budget_items', item.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project budget items (${budgetItems.filter(b => b.phase_id === null).length} overall, ${budgetItems.filter(b => b.phase_id !== null).length} phase-specific)`);
      return data || [];
    };

    // Step 11: Seed project financial entries (income and expenses)
    const seedProjectFinancialEntries = async (projects: any[], clients: any[], batchId: string) => {
      addLog('phase', 'Seeding project financial entries...', 'Step 11');
      const entries = [];

      for (const project of projects) {
        const client = clients.find(c => c.id === project.client_id);
        const clientName = client?.name || 'Client';

        // Income entries (progress payments) - Always generate income
        const numPayments = 4 + Math.floor(Math.random() * 6); // 4-9 payments per project
        for (let i = 0; i < numPayments; i++) {
          const paymentDate = new Date(project.start_date);
          paymentDate.setMonth(paymentDate.getMonth() + i * 2);
          const amount = (project.budget_total / numPayments) * (0.8 + Math.random() * 0.4);

          entries.push({
            project_id: project.id,
            entry_type: 'income',
            category: ['Progress Payment', 'Milestone Payment', 'Final Payment', 'Advance Payment'][Math.floor(Math.random() * 4)],
            amount: Math.round(amount * 100) / 100, // Round to 2 decimals
            date: paymentDate.toISOString().split('T')[0],
            payment_method: ['Bank Transfer', 'Check', 'Wire Transfer'][Math.floor(Math.random() * 3)],
            recipient_payer: clientName,
            reference: `INV-${project.id.substring(0, 8).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
            description: `Payment ${i + 1} of ${numPayments} for ${project.name}`,
          });
        }

        // Expense entries - Always generate expenses (remove seedConfig check)
        const expenseCategories = ['Materiais', 'Mão de Obra', 'Locação de Equipamentos', 'Subcontratados', 'Utilidades', 'Seguro', 'Licenças', 'Transporte'];
        const numExpenses = 15 + Math.floor(Math.random() * 20); // 15-34 expenses per project

        for (let i = 0; i < numExpenses; i++) {
          const expenseDate = new Date(project.start_date);
          expenseDate.setDate(expenseDate.getDate() + Math.floor(Math.random() * 365));
          const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
          // Expenses should be proportional to project budget
          const amount = (project.budget_total / numExpenses) * (0.5 + Math.random() * 0.5);

          entries.push({
            project_id: project.id,
            entry_type: 'expense',
            category,
            amount: Math.round(amount * 100) / 100, // Round to 2 decimals
            date: expenseDate.toISOString().split('T')[0],
            payment_method: ['Transferência Bancária', 'Cheque', 'Cartão de Crédito', 'Dinheiro'][Math.floor(Math.random() * 4)],
            recipient_payer: `Fornecedor ${category} ${i + 1}`,
            reference: `EXP-${project.id.substring(0, 8).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
            description: `Despesa de ${category} para ${project.name}`,
          });
        }
      }

      if (entries.length === 0) {
        addLog('info', 'No financial entries to seed');
        return [];
      }

      const { data, error } = await supabase.from('project_financial_entries').insert(entries).select();
      if (error) {
        throw new Error(`Failed to seed project financial entries: ${error.message}`);
      }

      for (const entry of data || []) {
        await registerSeedRecord('project_financial_entries', entry.id, batchId);
      }

      const incomeCount = entries.filter(e => e.entry_type === 'income').length;
      const expenseCount = entries.filter(e => e.entry_type === 'expense').length;
      addLog('success', `Seeded ${data?.length || 0} project financial entries (${incomeCount} income, ${expenseCount} expenses)`);
      return data || [];
    };

    // Step 12: Seed purchase requests
    const seedPurchaseRequests = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding purchase requests...', 'Step 12');
      const requests = [];

      for (const project of projects) {
        const numRequests = 2 + Math.floor(Math.random() * 4);
        const statuses: any[] = ['pending', 'quoted', 'approved', 'ordered', 'delivered'];

        for (let i = 0; i < numRequests; i++) {
          const requestDate = new Date(project.start_date);
          requestDate.setDate(requestDate.getDate() + Math.floor(Math.random() * 180));
          const deliveryDate = new Date(requestDate);
          deliveryDate.setDate(deliveryDate.getDate() + 7 + Math.floor(Math.random() * 30));
          const status = statuses[Math.min(i, statuses.length - 1)];
          const totalEstimated = (5000 + Math.random() * 50000) / 100;
          const totalActual = status === 'delivered' ? totalEstimated * (0.95 + Math.random() * 0.1) : null;

          requests.push({
            project_id: project.id,
            requested_by: `User ${i + 1}`,
            priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
            delivery_date: deliveryDate.toISOString().split('T')[0],
            status,
            total_estimated: totalEstimated,
            total_actual: totalActual,
          });
        }
      }

      const { data, error } = await supabase.from('project_purchase_requests').insert(requests).select();
      if (error) {
        throw new Error(`Failed to seed purchase requests: ${error.message}`);
      }

      for (const request of data || []) {
        await registerSeedRecord('project_purchase_requests', request.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} purchase requests`);
      return data || [];
    };

    // Step 13: Seed purchase request items
    const seedPurchaseRequestItems = async (purchaseRequests: any[], batchId: string) => {
      addLog('phase', 'Seeding purchase request items...', 'Step 13');
      const items = [];

      for (const request of purchaseRequests) {
        const numItems = 2 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numItems; i++) {
          const estimatedPrice = (100 + Math.random() * 5000) / 100;
          const actualPrice = request.status === 'delivered' ? estimatedPrice * (0.95 + Math.random() * 0.1) : null;

          items.push({
            request_id: request.id,
            description: `Item ${i + 1} da Solicitação de Compra ${request.id.substring(0, 8)}`,
            quantity: 1 + Math.floor(Math.random() * 20),
            unit: ['unidades', 'kg', 'm²', 'm³', 'horas'][Math.floor(Math.random() * 5)],
            estimated_price: estimatedPrice,
            actual_price: actualPrice,
            supplier: `Fornecedor ${i + 1}`,
          });
        }
      }

      const { data, error } = await supabase.from('purchase_request_items').insert(items).select();
      if (error) {
        throw new Error(`Failed to seed purchase request items: ${error.message}`);
      }

      for (const item of data || []) {
        await registerSeedRecord('purchase_request_items', item.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} purchase request items`);
      return data || [];
    };

    // Step 14: Seed quote requests
    const seedQuoteRequests = async (purchaseRequests: any[], suppliers: any[], batchId: string) => {
      addLog('phase', 'Seeding quote requests...', 'Step 14');

      // Check if quote_requests table exists
      const { error: tableCheckError } = await supabase
        .from('quote_requests')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        if (tableCheckError.message.includes('does not exist') || tableCheckError.message.includes('schema cache')) {
          addLog('info', 'Quote requests table does not exist. Skipping quote requests seeding. Please run the migration: 20251103181510_create_quote_requests.sql');
          return [];
        }
        throw new Error(`Failed to check quote_requests table: ${tableCheckError.message}`);
      }

      const quoteRequests = [];

      if (!purchaseRequests || purchaseRequests.length === 0) {
        addLog('info', 'No purchase requests to create quote requests for');
        return [];
      }

      if (!suppliers || suppliers.length === 0) {
        addLog('info', 'No suppliers available to create quote requests');
        return [];
      }

      for (const request of purchaseRequests) {
        // Only create quote requests for pending or quoted purchase requests
        if (!['pending', 'quoted'].includes(request.status)) continue;

        const numSuppliers = 2 + Math.floor(Math.random() * 3);
        const selectedSuppliers = suppliers
          .sort(() => Math.random() - 0.5)
          .slice(0, numSuppliers);

        for (const supplier of selectedSuppliers) {
          const statuses: ('draft' | 'sent' | 'responded' | 'expired' | 'cancelled')[] = ['draft', 'sent', 'responded'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          const requestDate = new Date(request.created_at || new Date());
          const responseDeadline = new Date(requestDate);
          responseDeadline.setDate(responseDeadline.getDate() + 7 + Math.floor(Math.random() * 14)); // 7-21 days deadline

          const sentViaOptions: ('email' | 'whatsapp' | 'both')[] = ['email', 'whatsapp', 'both'];
          const sentVia = status === 'draft' ? null : sentViaOptions[Math.floor(Math.random() * sentViaOptions.length)];

          const sentAt = status === 'sent' || status === 'responded' 
            ? new Date(requestDate.getTime() + Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000).toISOString()
            : null;

          // Don't include request_number - let the database trigger generate it automatically
          // The trigger will generate format: QR-YYYY-MM-###
          const quoteRequestData: any = {
            purchase_request_id: request.id,
            supplier_id: supplier.id,
            status: status,
            sent_at: sentAt,
            sent_via: sentVia,
            response_deadline: responseDeadline.toISOString(),
          };

          quoteRequests.push(quoteRequestData);
        }
      }

      if (quoteRequests.length === 0) {
        addLog('info', 'No quote requests to seed (no pending/quoted purchase requests)');
        return [];
      }

      // Use type cast for quote_requests table as it may not be in generated types yet
      const { data, error } = await (supabase as any).from('quote_requests').insert(quoteRequests).select();
      if (error) {
        throw new Error(`Failed to seed quote requests: ${error.message}`);
      }

      for (const qr of data || []) {
        await registerSeedRecord('quote_requests', qr.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} quote requests`);
      return data || [];
    };

    // Step 15: Seed quotes
    const seedQuotes = async (purchaseRequestItems: any[], suppliers: any[], batchId: string) => {
      addLog('phase', 'Seeding quotes...', 'Step 15');
      const quotes = [];

      if (!purchaseRequestItems || purchaseRequestItems.length === 0) {
        addLog('info', 'No purchase request items to generate quotes for');
        return [];
      }

      if (!suppliers || suppliers.length === 0) {
        addLog('info', 'No suppliers available to generate quotes');
        return [];
      }

      // Generate multiple quotes per item (2-3 suppliers per item for comparison)
      for (const item of purchaseRequestItems) {
        const numQuotes = 2 + Math.floor(Math.random() * 2); // 2-3 quotes per item
        const selectedSuppliers = [...suppliers]
          .sort(() => Math.random() - 0.5)
          .slice(0, numQuotes);

        for (const supplier of selectedSuppliers) {
          // Generate realistic pricing (90-110% of estimated price)
          const unitPrice = item.estimated_price * (0.9 + Math.random() * 0.2);
          const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
          const deliveryDays = 7 + Math.floor(Math.random() * 21);

          // Weight status distribution: more approved quotes for better demo data
          const statusRoll = Math.random();
          const status = statusRoll < 0.4 ? 'approved' : statusRoll < 0.7 ? 'pending' : 'rejected';

          quotes.push({
            purchase_request_item_id: item.id,
            supplier_id: supplier.id,
            unit_price: Math.round(unitPrice * 100) / 100,
            total_price: totalPrice,
            delivery_days: deliveryDays,
            status,
          });
        }
      }

      if (quotes.length === 0) {
        addLog('info', 'No quotes generated');
        return [];
      }

      const { data, error } = await supabase.from('quotes').insert(quotes).select();
      if (error) {
        throw new Error(`Failed to seed quotes: ${error.message}`);
      }

      for (const quote of data || []) {
        await registerSeedRecord('quotes', quote.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} quotes`);
      return data || [];
    };

    // Step 15b: Seed quote approvals
    const seedQuoteApprovals = async (quotes: any[], batchId: string) => {
      addLog('phase', 'Seeding quote approvals...', 'Step 15b');

      const hasQuoteIdColumn = await hasColumn('quote_approvals', 'quote_id');
      if (!hasQuoteIdColumn) {
        addLog('info', 'quote_approvals.quote_id not available. Skipping quote approvals seeding.');
        return [];
      }

      const approvals = [];
      const baseDate = getDemoDate();

      // Create approvals for approved quotes
      for (const quote of quotes.filter(q => q.status === 'approved')) {
        approvals.push({
          quote_id: quote.id,
          approved_by: 'Finance Manager',
          approval_date: baseDate.toISOString(),
          notes: `Quote approved for supplier ${quote.supplier_id}. Good pricing and delivery terms.`,
        });
      }

      if (approvals.length === 0) {
        addLog('info', 'No quotes to approve');
        return [];
      }

      const { data, error } = await supabase.from('quote_approvals').insert(approvals).select();
      if (error) {
        addLog('error', `Failed to seed quote approvals: ${error.message}`);
        return [];
      }

      for (const approval of data || []) {
        await registerSeedRecord('quote_approvals', approval.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} quote approvals`);
      return data || [];
    };

    // Step 16: Seed purchase orders
    const seedPurchaseOrders = async (projects: any[], quotes: any[], suppliers: any[], purchaseRequests: any[], batchId: string) => {
      addLog('phase', 'Seeding purchase orders...', 'Step 16');
      const purchaseOrders = [];

      // Get approved quotes
      const approvedQuotes = quotes.filter(q => q.status === 'approved');
      if (approvedQuotes.length === 0) {
        addLog('info', 'No approved quotes to create purchase orders from');
        return [];
      }

      // Group quotes by request (via purchase_request_item)
      const quotesByRequest = new Map<string, any[]>();
      for (const quote of approvedQuotes) {
        // Get the purchase request item to find the request
        const { data: item } = await supabase
          .from('purchase_request_items')
          .select('request_id')
          .eq('id', quote.purchase_request_item_id)
          .single();

        if (item) {
          const requestId = item.request_id;
          if (!quotesByRequest.has(requestId)) {
            quotesByRequest.set(requestId, []);
          }
          quotesByRequest.get(requestId)!.push(quote);
        }
      }

      // Status distribution: mix of statuses including some delivered/in_transit for delivery confirmations
      const statusOptions = ['draft', 'sent', 'acknowledged', 'in_transit', 'delivered'];
      const statusWeights = [0.1, 0.2, 0.2, 0.25, 0.25]; // More weight to delivered/in_transit for realistic data

      for (const [requestId, requestQuotes] of quotesByRequest.entries()) {
        const request = purchaseRequests.find(r => r.id === requestId);
        if (!request) continue;

        // Use the first approved quote for this request
        const quote = requestQuotes[0];
        const supplier = suppliers.find(s => s.id === quote.supplier_id);
        if (!supplier) continue;

        const subtotal = quote.total_price;
        const taxAmount = subtotal * 0.1;
        const totalAmount = subtotal + taxAmount;
        const expectedDelivery = new Date();
        expectedDelivery.setDate(expectedDelivery.getDate() + quote.delivery_days);

        // Weighted random status selection
        const random = Math.random();
        let cumulativeWeight = 0;
        let selectedStatus = statusOptions[0];
        for (let i = 0; i < statusOptions.length; i++) {
          cumulativeWeight += statusWeights[i];
          if (random <= cumulativeWeight) {
            selectedStatus = statusOptions[i];
            break;
          }
        }

        // Ensure validity against the valid_acknowledgment constraint:
        // - acknowledged_at implies sent_at
        // - acknowledged status requires acknowledged_at
        const sentAt = new Date().toISOString();
        const acknowledgedAt = selectedStatus === 'acknowledged' ? sentAt : null;

        purchaseOrders.push({
          project_id: request.project_id,
          quote_id: quote.id,
          supplier_id: supplier.id,
          purchase_request_id: requestId,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency_id: 'BRL',
          payment_terms: 'Net 30',
          payment_due_date: new Date(expectedDelivery.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expected_delivery_date: expectedDelivery.toISOString().split('T')[0],
          status: selectedStatus,
          sent_at: sentAt,
          acknowledged_at: acknowledgedAt,
        });
      }

      const { data, error } = await supabase.from('purchase_orders').insert(purchaseOrders).select();
      if (error) {
        throw new Error(`Failed to seed purchase orders: ${error.message}`);
      }

      for (const po of data || []) {
        await registerSeedRecord('purchase_orders', po.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} purchase orders`);
      return data || [];
    };

    // Step 17: Seed delivery confirmations
    const seedDeliveryConfirmations = async (purchaseOrders: any[], projects: any[], batchId: string) => {
      addLog('phase', 'Seeding delivery confirmations...', 'Step 17');
      const confirmations = [];

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        addLog('info', 'No purchase orders to create delivery confirmations for');
        return [];
      }

      // Create delivery confirmations for delivered and in_transit purchase orders
      for (const po of purchaseOrders) {
        if (po.status === 'delivered' || po.status === 'in_transit') {
          const project = projects.find(p => p.id === po.project_id);
          if (!project) {
            addLog('info', `Project not found for PO ${po.id}`);
            continue;
          }

          // Calculate delivery date (can be on or before expected date)
          const expectedDate = po.expected_delivery_date 
            ? new Date(po.expected_delivery_date)
            : new Date();
          const deliveryDate = new Date(expectedDate);
          // Sometimes delivery is early or on time
          const daysOffset = Math.floor(Math.random() * 5) - 2; // -2 to +2 days
          deliveryDate.setDate(deliveryDate.getDate() + daysOffset);
          // Ensure delivery date is not in the future
          if (deliveryDate > new Date()) {
            deliveryDate.setTime(new Date().getTime());
          }

          const hasIssues = Math.random() < 0.15; // 15% chance of issues
          const verificationStatus = po.status === 'delivered' 
            ? (Math.random() > 0.1 ? 'verified' : 'pending')
            : 'pending';

          const confirmation: any = {
            purchase_order_id: po.id,
            project_id: po.project_id,
            confirmed_by_user_id: userId || '00000000-0000-0000-0000-000000000000',
            delivery_date: deliveryDate.toISOString().split('T')[0],
            signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            checklist: {
              items_match_po: true,
              no_damage: !hasIssues,
              correct_quantity: true,
              packaging_intact: !hasIssues,
            },
            has_issues: hasIssues,
            issues_description: hasIssues ? 'Danos menores na embalagem observados durante a inspeção' : null,
            verification_status: verificationStatus,
          };

          // If verified, add verified_by_manager_id and verified_at
          if (verificationStatus === 'verified') {
            confirmation.verified_by_manager_id = userId || '00000000-0000-0000-0000-000000000000';
            confirmation.verified_at = deliveryDate.toISOString();
          }

          confirmations.push(confirmation);
        }
      }

      if (confirmations.length === 0) {
        addLog('info', 'No delivery confirmations to seed (no delivered/in_transit purchase orders)');
        return [];
      }

      const { data, error } = await supabase.from('delivery_confirmations').insert(confirmations).select();
      if (error) {
        throw new Error(`Failed to seed delivery confirmations: ${error.message}`);
      }

      for (const confirmation of data || []) {
        await registerSeedRecord('delivery_confirmations', confirmation.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} delivery confirmations`);
      return data || [];
    };

    // Step 18: Seed payment transactions
    const seedPaymentTransactions = async (purchaseOrders: any[], deliveryConfirmations: any[], batchId: string) => {
      addLog('phase', 'Seeding payment transactions...', 'Step 18');
      const payments = [];

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        addLog('info', 'No purchase orders to create payment transactions for');
        return [];
      }

      // Create payment transactions for ALL purchase orders (payment obligation exists when PO is created)
      // Link to delivery confirmation if available, but don't require it
      for (const po of purchaseOrders) {
        const delivery = deliveryConfirmations?.find(d => d.purchase_order_id === po.id);

        // Determine payment status based on PO status and delivery confirmation
        let paymentStatus: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled' = 'pending';
        let paidAt: string | null = null;

        if (po.status === 'delivered' && delivery?.verification_status === 'verified') {
          // If PO is delivered and verified, mark payment as completed (80% chance)
          paymentStatus = Math.random() > 0.2 ? 'completed' : 'scheduled';
          if (paymentStatus === 'completed') {
            const deliveryDate = delivery.delivery_date ? new Date(delivery.delivery_date) : new Date();
            // Paid date is typically 1-30 days after delivery
            const paidDate = new Date(deliveryDate);
            paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 30) + 1);
            paidAt = paidDate.toISOString();
          }
        } else if (po.status === 'in_transit' || po.status === 'delivered') {
          // If PO is in transit or delivered, payment is scheduled
          paymentStatus = 'scheduled';
        } else if (po.status === 'acknowledged') {
          // If PO is acknowledged, payment is scheduled
          paymentStatus = 'scheduled';
        } else {
          // Draft or sent POs have pending payments
          paymentStatus = 'pending';
        }

        // Calculate due date based on payment terms (default: Net 30 from expected delivery or today)
        const baseDate = po.expected_delivery_date ? new Date(po.expected_delivery_date) : new Date();
        const paymentTerms = po.payment_terms || 'Net 30';
        const daysToAdd = paymentTerms.includes('Net 60') ? 60 : paymentTerms.includes('Net 90') ? 90 : paymentTerms.includes('Immediate') ? 0 : 30;
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + daysToAdd);

        // Ensure project_id is present (required field)
        if (!po.project_id) {
            addLog('info', `Purchase order ${po.id} missing project_id, skipping payment transaction`);
          continue;
        }

        payments.push({
          purchase_order_id: po.id,
          project_id: po.project_id, // Required field
          delivery_confirmation_id: delivery?.id || null,
          amount: po.total_amount || 0,
          currency_id: po.currency_id || 'BRL',
          payment_terms: paymentTerms,
          due_date: dueDate.toISOString().split('T')[0],
          status: paymentStatus,
          payment_method: paymentStatus === 'completed' ? ['Transferência Bancária', 'Cheque', 'Cartão de Crédito'][Math.floor(Math.random() * 3)] : null,
          transaction_reference: paymentStatus === 'completed' ? `TXN-${Date.now()}-${po.id.substring(0, 8).toUpperCase()}` : null,
          notes: `Pagamento para OC ${po.purchase_order_number || po.id.substring(0, 8)}`,
          created_by: userId || '00000000-0000-0000-0000-000000000000',
          paid_at: paidAt,
        });
      }

      if (payments.length === 0) {
        addLog('info', 'No payment transactions to seed (no valid purchase orders)');
        return [];
      }

      const { data, error } = await supabase.from('payment_transactions').insert(payments).select();
      if (error) {
        throw new Error(`Failed to seed payment transactions: ${error.message}`);
      }

      for (const payment of data || []) {
        await registerSeedRecord('payment_transactions', payment.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} payment transactions`);
      return data || [];
    };

    // Step 19: Seed project time logs
    const seedProjectTimeLogs = async (projects: any[], activities: any[], batchId: string) => {
      addLog('phase', 'Seeding project time logs...', 'Step 19');
      const timeLogs = [];

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const crewNames = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];

      for (const activity of activities) {
        const completionPercentage = activity.completion_percentage || 0;
        if (completionPercentage > 0) {
          const numLogs = 3 + Math.floor(Math.random() * 5);
          const startDate = new Date(activity.start_date);

          for (let i = 0; i < numLogs; i++) {
            const logDate = new Date(startDate);
            logDate.setDate(logDate.getDate() + i * 2);
            const hours = 4 + Math.random() * 6;
            const crewName = crewNames[Math.floor(Math.random() * crewNames.length)];

            timeLogs.push({
              project_id: activity.project_id,
              crew_name: crewName,
              hours_worked: hours,
              activity: activity.name || 'Construction work',
              log_date: logDate.toISOString().split('T')[0],
              logged_by: userId,
            });
          }
        }
      }

      const { data, error } = await supabase.from('time_logs').insert(timeLogs).select();
      if (error) {
        throw new Error(`Failed to seed project time logs: ${error.message}`);
      }

      for (const log of data || []) {
        await registerSeedRecord('time_logs', log.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project time logs`);
      return data || [];
    };

    // Step 20: Seed project daily logs
    const seedProjectDailyLogs = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project daily logs...', 'Step 20');
      const dailyLogs = [];

      for (const project of projects) {
        const startDate = new Date(project.start_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const numLogs = Math.min(30, Math.max(5, Math.floor(daysDiff / 3)));

        for (let i = 0; i < numLogs; i++) {
          const logDate = new Date(startDate);
          logDate.setDate(logDate.getDate() + i * 3);
          if (logDate > today) break;

          const weatherOptions = ['sunny', 'cloudy', 'rainy', 'stormy'];
          const hasIssues = Math.random() < 0.3;

          dailyLogs.push({
            project_id: project.id,
            log_date: logDate.toISOString().split('T')[0],
            weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
            tasks_completed: `Daily work progress on ${project.name}`,
            workers_count: 5 + Math.floor(Math.random() * 15),
            equipment_used: 'Excavator, Crane, Concrete mixer',
            materials_delivered: 'Various construction materials',
            issues: hasIssues ? 'Minor delay due to weather' : null,
            safety_incidents: null,
            photos: [],
          });
        }
      }

      const { data, error } = await supabase.from('daily_logs').insert(dailyLogs).select();
      if (error) {
        throw new Error(`Failed to seed project daily logs: ${error.message}`);
      }

      for (const log of data || []) {
        await registerSeedRecord('daily_logs', log.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project daily logs`);
      return data || [];
    };

    // Step 21: Seed activity resource assignments
    const seedProjectAssignments = async (projects: any[], activities: any[], resources: any[], batchId: string) => {
      addLog('phase', 'Seeding activity resource assignments...', 'Step 21');
      const assignments = [];

      for (const project of projects) {
        const projectActivities = activities.filter(a => a.project_id === project.id);
        const projectResources = resources.filter(r => r.project_id === project.id);

        if (projectResources.length === 0) continue;

        for (const activity of projectActivities) {
          const numAssignments = 1 + Math.floor(Math.random() * 3);
          const selectedResources = projectResources
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(numAssignments, projectResources.length));

          for (const resource of selectedResources) {
            assignments.push({
              activity_id: activity.id,
              resource_id: resource.id,
              units_required: 1 + Math.random() * 5,
              allocation_percentage: 50 + Math.random() * 50,
            });
          }
        }
      }

      if (assignments.length === 0) {
        addLog('info', 'No activity resource assignments to seed (no resources available)');
        return [];
      }

      const { data, error } = await supabase.from('activity_resource_assignments').insert(assignments).select();
      if (error) {
        addLog('error', `Failed to seed activity resource assignments: ${error.message}`);
        return [];
      }

      for (const assignment of data || []) {
        await registerSeedRecord('activity_resource_assignments', assignment.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} activity resource assignments`);
      return data || [];
    };

    // Step 22 & 23: Income and expenses are handled in project_financial_entries (already seeded in Step 11)
    // These steps are skipped as they're part of the unified financial entries table
    const seedProjectIncome = async (projects: any[], batchId: string) => {
      addLog('info', 'Skipping separate project_income table (income handled in project_financial_entries)');
      return [];
    };

    const seedProjectExpenses = async (projects: any[], batchId: string) => {
      addLog('info', 'Skipping separate project_expenses table (expenses handled in project_financial_entries)');
      return [];
    };

    // Step 24: Seed site issues
    const seedSiteIssues = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding site issues...', 'Step 24');

      const hasReportedDate = await hasColumn('site_issues', 'reported_date');
      if (!hasReportedDate) {
        addLog('info', 'site_issues.reported_date not available. Skipping site issues seeding.');
        return [];
      }
      const issues = [];

      for (const project of projects) {
        const numIssues = 2 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numIssues; i++) {
          const issueDate = new Date(project.start_date);
          issueDate.setDate(issueDate.getDate() + Math.floor(Math.random() * 180));

          issues.push({
            project_id: project.id,
            title: `Site Issue ${i + 1}`,
            description: `Issue encountered during construction: ${['Safety concern', 'Material delay', 'Weather impact', 'Equipment failure', 'Quality issue'][Math.floor(Math.random() * 5)]}`,
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            status: ['open', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)],
            reported_date: issueDate.toISOString().split('T')[0],
            reported_by: `Team Member ${i + 1}`,
            resolution_notes: Math.random() > 0.5 ? 'Issue resolved successfully' : null,
          });
        }
      }

      const { data, error } = await supabase.from('site_issues').insert(issues).select();
      if (error) {
        addLog('error', `Failed to seed site issues: ${error.message}`);
        return [];
      }

      for (const issue of data || []) {
        await registerSeedRecord('site_issues', issue.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} site issues`);
      return data || [];
    };

    // Step 25: Seed quality inspections
    const seedQualityInspections = async (projects: any[], phases: any[], batchId: string) => {
      addLog('phase', 'Seeding quality inspections...', 'Step 25');

      const hasFindings = await hasColumn('quality_inspections', 'findings');
      if (!hasFindings) {
        addLog('info', 'quality_inspections.findings not available. Skipping quality inspections seeding.');
        return [];
      }
      const inspections = [];

      for (const project of projects) {
        const projectPhases = phases.filter(p => p.project_id === project.id);
        for (const phase of projectPhases) {
          if (phase.status === 'completed' || phase.status === 'in_progress') {
            const inspectionDate = new Date(phase.end_date || phase.start_date);
            inspectionDate.setDate(inspectionDate.getDate() - Math.floor(Math.random() * 7));

            inspections.push({
              project_id: project.id,
              phase_id: phase.id,
              inspection_date: inspectionDate.toISOString().split('T')[0],
              inspector_name: `Inspector ${Math.floor(Math.random() * 3) + 1}`,
              inspection_type: ['Safety', 'Quality', 'Compliance'][Math.floor(Math.random() * 3)],
              status: ['passed', 'failed', 'pending'][Math.floor(Math.random() * 3)],
              findings: `Inspection findings for ${phase.phase_name}`,
              recommendations: Math.random() > 0.5 ? 'Continue with current practices' : 'Minor improvements needed',
            });
          }
        }
      }

      const { data, error } = await supabase.from('quality_inspections').insert(inspections).select();
      if (error) {
        addLog('error', `Failed to seed quality inspections: ${error.message}`);
        return [];
      }

      for (const inspection of data || []) {
        await registerSeedRecord('quality_inspections', inspection.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} quality inspections`);
      return data || [];
    };

    // Step 26: Seed project documents
    const seedProjectDocuments = async (projects: any[], batchId: string) => {
      if (!seedConfig.includeDocuments) {
        addLog('info', 'Skipping project documents (disabled in config)');
        return [];
      }

      addLog('phase', 'Seeding project documents...', 'Step 26');
      const documents = [];

      const documentTypes = ['Contract', 'Permit', 'Drawing', 'Specification', 'Report', 'Invoice', 'Certificate'];

      for (const project of projects) {
        const numDocs = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numDocs; i++) {
          const docDate = new Date(project.start_date);
          docDate.setDate(docDate.getDate() + Math.floor(Math.random() * 180));

          documents.push({
            project_id: project.id,
            document_name: `${documentTypes[Math.floor(Math.random() * documentTypes.length)]} ${i + 1}`,
            document_type: documentTypes[Math.floor(Math.random() * documentTypes.length)],
            file_url: `https://example.com/documents/${project.id}/${i + 1}.pdf`,
            uploaded_date: docDate.toISOString().split('T')[0],
            uploaded_by: `Usuário ${i + 1}`,
            description: `Documento para ${project.name}`,
          });
        }
      }

      const { data, error } = await supabase.from('project_documents').insert(documents).select();
      if (error) {
        addLog('error', `Failed to seed project documents: ${error.message}`);
        return [];
      }

      for (const doc of data || []) {
        await registerSeedRecord('project_documents', doc.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project documents`);
      return data || [];
    };

    // Step 27: Seed project photos
    const seedProjectPhotos = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project photos...', 'Step 27');

      const hasPhotoUrl = await hasColumn('project_photos', 'photo_url');
      if (!hasPhotoUrl) {
        addLog('info', 'project_photos.photo_url not available. Skipping project photos seeding.');
        return [];
      }
      const photos = [];

      for (const project of projects) {
        const numPhotos = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numPhotos; i++) {
          const photoDate = new Date(project.start_date);
          photoDate.setDate(photoDate.getDate() + Math.floor(Math.random() * 180));

          photos.push({
            project_id: project.id,
            photo_url: `https://example.com/photos/${project.id}/photo-${i + 1}.jpg`,
            caption: `Progress photo ${i + 1} for ${project.name}`,
            taken_date: photoDate.toISOString().split('T')[0],
            taken_by: `Photographer ${Math.floor(Math.random() * 3) + 1}`,
            category: ['Progress', 'Quality', 'Safety', 'Completion'][Math.floor(Math.random() * 4)],
          });
        }
      }

      const { data, error } = await supabase.from('project_photos').insert(photos).select();
      if (error) {
        addLog('error', `Failed to seed project photos: ${error.message}`);
        return [];
      }

      for (const photo of data || []) {
        await registerSeedRecord('project_photos', photo.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project photos`);
      return data || [];
    };

    // Step 27b: Seed photo comments
    const seedPhotoComments = async (photos: any[], batchId: string) => {
      addLog('phase', 'Seeding photo comments...', 'Step 27b');

      const hasPhotoIdColumn = await hasColumn('photo_comments', 'photo_id');
      if (!hasPhotoIdColumn) {
        addLog('info', 'photo_comments.photo_id not available. Skipping photo comments seeding.');
        return [];
      }

      const photoComments = [];
      const baseDate = getDemoDate();

      for (const photo of photos.slice(0, Math.min(10, photos.length))) {
        photoComments.push({
          photo_id: photo.id,
          comment_text: `Great progress on this photo! Looking forward to seeing the next updates.`,
          commenter_name: 'Project Manager',
          created_at: baseDate.toISOString(),
        });
      }

      if (photoComments.length === 0) {
        addLog('info', 'No photos available for comments');
        return [];
      }

      const { data, error } = await supabase.from('photo_comments').insert(photoComments).select();
      if (error) {
        addLog('error', `Failed to seed photo comments: ${error.message}`);
        return [];
      }

      for (const comment of data || []) {
        await registerSeedRecord('photo_comments', comment.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} photo comments`);
      return data || [];
    };

    // Step 28: Seed roadmap items
    const seedRoadmapItems = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding roadmap items...', 'Step 28');

      const hasProjectId = await hasColumn('roadmap_items', 'project_id');
      if (!hasProjectId) {
        addLog('info', 'roadmap_items.project_id not available. Skipping roadmap items seeding.');
        return [];
      }
      const roadmapItems = [];

      for (const project of projects) {
        const numItems = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numItems; i++) {
          const itemDate = new Date(project.start_date);
          itemDate.setMonth(itemDate.getMonth() + i * 2);

          roadmapItems.push({
            project_id: project.id,
            title: `Item do Roadmap ${i + 1}`,
            description: `Marco planejado para ${project.name}`,
            target_date: itemDate.toISOString().split('T')[0],
            status: ['planned', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          });
        }
      }

      const { data, error } = await supabase.from('roadmap_items').insert(roadmapItems).select();
      if (error) {
        addLog('error', `Failed to seed roadmap items: ${error.message}`);
        return [];
      }

      for (const item of data || []) {
        await registerSeedRecord('roadmap_items', item.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} roadmap items`);
      return data || [];
    };

    // Step 29: Seed sprints
    const seedSprints = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding sprints...', 'Step 29');

      const hasGoal = await hasColumn('sprints', 'goal');
      if (!hasGoal) {
        addLog('info', 'sprints.goal not available. Skipping sprints seeding.');
        return [];
      }
      const sprints = [];

      for (const project of projects) {
        const numSprints = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numSprints; i++) {
          const sprintStart = new Date(project.start_date);
          sprintStart.setMonth(sprintStart.getMonth() + i * 2);
          const sprintEnd = new Date(sprintStart);
          sprintEnd.setDate(sprintEnd.getDate() + 14);

          sprints.push({
            project_id: project.id,
            sprint_name: `Sprint ${i + 1}`,
            start_date: sprintStart.toISOString().split('T')[0],
            end_date: sprintEnd.toISOString().split('T')[0],
            status: ['planned', 'active', 'completed'][Math.floor(Math.random() * 3)],
            goal: `Sprint goal for ${project.name}`,
          });
        }
      }

      const { data, error } = await supabase.from('sprints').insert(sprints).select();
      if (error) {
        addLog('error', `Failed to seed sprints: ${error.message}`);
        return [];
      }

      for (const sprint of data || []) {
        await registerSeedRecord('sprints', sprint.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} sprints`);
      return data || [];
    };

    // Step 30: Seed project estimates
    const seedProjectEstimates = async (projects: any[], clients: any[], batchId: string) => {
      addLog('phase', 'Seeding project estimates...', 'Step 30');
      const estimates = [];

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      for (const project of projects) {
        const client = clients.find(c => c.id === project.client_id);
        const estimateDate = new Date(project.start_date);
        estimateDate.setDate(estimateDate.getDate() - 30);

        estimates.push({
          project_id: project.id,
          client_id: client?.id || null,
          user_id: userId || '00000000-0000-0000-0000-000000000000',
          name: `Estimate for ${project.name}`,
          description: `Initial cost estimate`,
          status: 'accepted',
          subtotal: project.budget_total * 0.9,
          tax_rate: 0.1,
          tax_amount: project.budget_total * 0.09,
          total: project.budget_total,
          ai_generated: false,
          created_at: estimateDate.toISOString(),
        });
      }

      const { data, error } = await supabase.from('estimates').insert(estimates).select();
      if (error) {
        addLog('error', `Failed to seed project estimates: ${error.message}`);
        return [];
      }

      for (const estimate of data || []) {
        await registerSeedRecord('estimates', estimate.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project estimates`);
      return data || [];
    };

    // Step 31: Seed project calendar events
    const seedProjectCalendarEvents = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project calendar events...', 'Step 31');

      const hasTable = await hasColumn('project_calendar_events', 'id');
      if (!hasTable) {
        addLog('info', 'project_calendar_events table not available. Skipping calendar events seeding.');
        return [];
      }
      const events = [];

      for (const project of projects) {
        const numEvents = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numEvents; i++) {
          const eventDate = new Date(project.start_date);
          eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 365));

          events.push({
            project_id: project.id,
            title: `Evento ${i + 1} para ${project.name}`,
            description: `Evento do calendário: ${['Reunião', 'Inspeção', 'Entrega', 'Marco', 'Revisão'][Math.floor(Math.random() * 5)]}`,
            event_date: eventDate.toISOString().split('T')[0],
            event_type: ['meeting', 'inspection', 'delivery', 'milestone', 'review'][Math.floor(Math.random() * 5)],
            location: project.location || 'Canteiro de Obras',
          });
        }
      }

      const { data, error } = await (supabase as any).from('project_calendar_events').insert(events).select();
      if (error) {
        addLog('error', `Failed to seed project calendar events: ${error.message}`);
        return [];
      }

      for (const event of data || []) {
        await registerSeedRecord('project_calendar_events', event.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} project calendar events`);
      return data || [];
    };

    // Step 32: Seed cost predictions
    const seedCostPredictions = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding cost predictions...', 'Step 32');

      const hasNotes = await hasColumn('cost_predictions', 'notes');
      if (!hasNotes) {
        addLog('info', 'cost_predictions.notes not available. Skipping cost predictions seeding.');
        return [];
      }
      const predictions = [];

      for (const project of projects) {
        const numPredictions = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numPredictions; i++) {
          const predictionDate = new Date(project.start_date);
          predictionDate.setDate(predictionDate.getDate() + Math.floor(Math.random() * 180));

          predictions.push({
            project_id: project.id,
            predicted_date: predictionDate.toISOString().split('T')[0],
            predicted_cost: project.budget_total * (0.9 + Math.random() * 0.2),
            confidence_level: 70 + Math.floor(Math.random() * 25),
            prediction_method: ['Histórico', 'Modelo ML', 'Estimativa de Especialista'][Math.floor(Math.random() * 3)],
            notes: `Previsão de custo para ${project.name}`,
          });
        }
      }

      const { data, error } = await supabase.from('cost_predictions').insert(predictions).select();
      if (error) {
        addLog('error', `Failed to seed cost predictions: ${error.message}`);
        return [];
      }

      for (const prediction of data || []) {
        await registerSeedRecord('cost_predictions', prediction.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} cost predictions`);
      return data || [];
    };

    // Step 32b: Seed exchange rates
    const seedExchangeRates = async (batchId: string) => {
      addLog('phase', 'Seeding exchange rates...', 'Step 32b');

      const hasCurrencyColumn = await hasColumn('exchange_rates', 'currency_code');
      if (!hasCurrencyColumn) {
        addLog('info', 'exchange_rates.currency_code not available. Skipping exchange rates seeding.');
        return [];
      }

      const baseDate = getDemoDate();
      const exchangeRates = [
        { currency_code: 'USD', rate: 5.15, base_currency: 'BRL' },
        { currency_code: 'EUR', rate: 5.75, base_currency: 'BRL' },
        { currency_code: 'GBP', rate: 6.50, base_currency: 'BRL' },
        { currency_code: 'JPY', rate: 0.035, base_currency: 'BRL' },
        { currency_code: 'CNY', rate: 0.70, base_currency: 'BRL' },
      ];

      const rates = exchangeRates.map(rate => ({
        ...rate,
        date: baseDate.toISOString().split('T')[0],
        source: 'Central Bank',
        last_updated: baseDate.toISOString(),
      }));

      const { data, error } = await supabase.from('exchange_rates').insert(rates).select();
      if (error) {
        addLog('error', `Failed to seed exchange rates: ${error.message}`);
        return [];
      }

      for (const rate of data || []) {
        await registerSeedRecord('exchange_rates', rate.id || `${rate.currency_code}-${rate.date}`, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} exchange rates`);
      return data || [];
    };

    // Step 33: Seed opportunities (Sales Pipeline - non-architect)
    const seedOpportunities = async (clients: any[], batchId: string) => {
      addLog('phase', 'Seeding opportunities (sales pipeline)...', 'Step 33b');

      const hasClientIdColumn = await hasColumn('opportunities', 'client_id');
      if (!hasClientIdColumn) {
        addLog('info', 'opportunities.client_id not available. Skipping opportunities seeding.');
        return [];
      }

      const opportunities = [];
      const baseDate = getDemoDate();
      const stages = ['lead', 'prospect', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

      for (const client of clients.slice(0, 4)) {
        const numOpps = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numOpps; i++) {
          const stage = stages[Math.floor(Math.random() * stages.length)];
          opportunities.push({
            client_id: client.id,
            title: `Sales Opportunity ${i + 1} - ${client.name}`,
            description: `Potential project with ${client.name}`,
            value: 10000 + Math.random() * 100000,
            stage,
            probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : 25 + Math.floor(Math.random() * 50),
            expected_close_date: baseDate.toISOString().split('T')[0],
            created_at: baseDate.toISOString(),
          });
        }
      }

      if (opportunities.length === 0) {
        addLog('info', 'No opportunities to seed');
        return [];
      }

      const { data, error } = await supabase.from('opportunities').insert(opportunities).select();
      if (error) {
        addLog('error', `Failed to seed opportunities: ${error.message}`);
        return [];
      }

      for (const opportunity of data || []) {
        await registerSeedRecord('opportunities', opportunity.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} opportunities`);
      return data || [];
    };

    // Step 33c: Seed opportunity briefings
    const seedOpportunityBriefings = async (opportunities: any[], batchId: string) => {
      addLog('phase', 'Seeding opportunity briefings...', 'Step 33c');

      const hasOpportunityIdColumn = await hasColumn('opportunity_briefings', 'opportunity_id');
      if (!hasOpportunityIdColumn) {
        addLog('info', 'opportunity_briefings.opportunity_id not available. Skipping opportunity briefings seeding.');
        return [];
      }

      const briefings = [];
      const baseDate = getDemoDate();

      for (const opportunity of opportunities.slice(0, Math.min(5, opportunities.length))) {
        briefings.push({
          opportunity_id: opportunity.id,
          briefing_notes: `Initial client briefing for ${opportunity.title}. Understanding needs and expectations.`,
          requirements: 'High-quality deliverables, clear timeline, budget constraints',
          timeline_weeks: 8 + Math.floor(Math.random() * 16),
          created_at: baseDate.toISOString(),
        });
      }

      if (briefings.length === 0) {
        addLog('info', 'No opportunities available for briefings');
        return [];
      }

      const { data, error } = await supabase.from('opportunity_briefings').insert(briefings).select();
      if (error) {
        addLog('error', `Failed to seed opportunity briefings: ${error.message}`);
        return [];
      }

      for (const briefing of data || []) {
        await registerSeedRecord('opportunity_briefings', briefing.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} opportunity briefings`);
      return data || [];
    };

    // Step 33d: Seed opportunity meetings
    const seedOpportunityMeetings = async (opportunities: any[], batchId: string) => {
      addLog('phase', 'Seeding opportunity meetings...', 'Step 33d');

      const hasOpportunityIdColumn = await hasColumn('opportunity_meetings', 'opportunity_id');
      if (!hasOpportunityIdColumn) {
        addLog('info', 'opportunity_meetings.opportunity_id not available. Skipping opportunity meetings seeding.');
        return [];
      }

      const meetings = [];
      const baseDate = getDemoDate();

      for (const opportunity of opportunities.slice(0, Math.min(5, opportunities.length))) {
        meetings.push({
          opportunity_id: opportunity.id,
          meeting_title: `Client Meeting - ${opportunity.title}`,
          meeting_date: baseDate.toISOString(),
          attendees: 'Project Manager, Client Representative',
          notes: `Discussed requirements and expectations. Next steps agreed.`,
          created_at: baseDate.toISOString(),
        });
      }

      if (meetings.length === 0) {
        addLog('info', 'No opportunities available for meetings');
        return [];
      }

      const { data, error } = await supabase.from('opportunity_meetings').insert(meetings).select();
      if (error) {
        addLog('error', `Failed to seed opportunity meetings: ${error.message}`);
        return [];
      }

      for (const meeting of data || []) {
        await registerSeedRecord('opportunity_meetings', meeting.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} opportunity meetings`);
      return data || [];
    };

    // Step 34: Seed meeting agendas (for non-architect meetings)
    const seedMeetingAgendas = async (meetings: any[], batchId: string) => {
      addLog('phase', 'Seeding meeting agendas...', 'Step 34');

      const hasMeetingIdColumn = await hasColumn('meeting_agendas', 'meeting_id');
      if (!hasMeetingIdColumn) {
        addLog('info', 'meeting_agendas.meeting_id not available. Skipping meeting agendas seeding.');
        return [];
      }

      const agendas = [];
      const baseDate = getDemoDate();

      const agendaItems = [
        'Review project progress and timeline',
        'Discuss budget and financial status',
        'Address any challenges or risks',
        'Plan next steps and deliverables',
        'Review design alternatives',
        'Stakeholder feedback and approvals',
      ];

      for (const meeting of meetings.slice(0, Math.min(8, meetings.length))) {
        const selectedItems = agendaItems
          .sort(() => Math.random() - 0.5)
          .slice(0, 2 + Math.floor(Math.random() * 3));

        agendas.push({
          meeting_id: meeting.id,
          agenda_items: selectedItems.join('\n'),
          estimated_duration_minutes: 60 + Math.floor(Math.random() * 60),
          created_at: baseDate.toISOString(),
        });
      }

      if (agendas.length === 0) {
        addLog('info', 'No meetings available for agendas');
        return [];
      }

      const { data, error } = await supabase.from('meeting_agendas').insert(agendas).select();
      if (error) {
        addLog('error', `Failed to seed meeting agendas: ${error.message}`);
        return [];
      }

      for (const agenda of data || []) {
        await registerSeedRecord('meeting_agendas', agenda.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} meeting agendas`);
      return data || [];
    };

    // Step 35: Seed meeting decisions
    const seedMeetingDecisions = async (meetings: any[], batchId: string) => {
      addLog('phase', 'Seeding meeting decisions...', 'Step 35');

      const hasMeetingIdColumn = await hasColumn('meeting_decisions', 'meeting_id');
      if (!hasMeetingIdColumn) {
        addLog('info', 'meeting_decisions.meeting_id not available. Skipping meeting decisions seeding.');
        return [];
      }

      const decisions = [];
      const baseDate = getDemoDate();

      const decisionTexts = [
        'Approved the proposed design changes',
        'Agreed on updated timeline',
        'Approved budget allocation',
        'Authorized contractor selection',
        'Confirmed material specifications',
        'Approved quality standards',
      ];

      for (const meeting of meetings.slice(0, Math.min(8, meetings.length))) {
        const selectedDecisions = decisionTexts
          .sort(() => Math.random() - 0.5)
          .slice(0, 1 + Math.floor(Math.random() * 2));

        for (const decision of selectedDecisions) {
          decisions.push({
            meeting_id: meeting.id,
            decision_text: decision,
            decision_owner: 'Project Manager',
            status: 'approved',
            created_at: baseDate.toISOString(),
          });
        }
      }

      if (decisions.length === 0) {
        addLog('info', 'No meetings available for decisions');
        return [];
      }

      const { data, error } = await supabase.from('meeting_decisions').insert(decisions).select();
      if (error) {
        addLog('error', `Failed to seed meeting decisions: ${error.message}`);
        return [];
      }

      for (const decision of data || []) {
        await registerSeedRecord('meeting_decisions', decision.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} meeting decisions`);
      return data || [];
    };

    // Step 36: Seed meeting action items
    const seedMeetingActionItems = async (meetings: any[], batchId: string) => {
      addLog('phase', 'Seeding meeting action items...', 'Step 36');

      const hasMeetingIdColumn = await hasColumn('meeting_action_items', 'meeting_id');
      if (!hasMeetingIdColumn) {
        addLog('info', 'meeting_action_items.meeting_id not available. Skipping meeting action items seeding.');
        return [];
      }

      const actionItems = [];
      const baseDate = getDemoDate();

      const actions = [
        'Prepare detailed design drawings',
        'Submit permit applications',
        'Order approved materials',
        'Schedule site inspection',
        'Prepare budget report',
        'Update project timeline',
        'Conduct stakeholder meeting',
        'Review contractor proposals',
      ];

      for (const meeting of meetings.slice(0, Math.min(8, meetings.length))) {
        const selectedActions = actions
          .sort(() => Math.random() - 0.5)
          .slice(0, 1 + Math.floor(Math.random() * 3));

        for (const action of selectedActions) {
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + 5 + Math.floor(Math.random() * 15));

          actionItems.push({
            meeting_id: meeting.id,
            action_description: action,
            assigned_to: 'Project Team',
            due_date: dueDate.toISOString().split('T')[0],
            status: 'open',
            created_at: baseDate.toISOString(),
          });
        }
      }

      if (actionItems.length === 0) {
        addLog('info', 'No meetings available for action items');
        return [];
      }

      const { data, error } = await supabase.from('meeting_action_items').insert(actionItems).select();
      if (error) {
        addLog('error', `Failed to seed meeting action items: ${error.message}`);
        return [];
      }

      for (const item of data || []) {
        await registerSeedRecord('meeting_action_items', item.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} meeting action items`);
      return data || [];
    };

    const seedClientPortalTeam = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal team members...', 'Client Portal');
      const baseDate = getDemoDate();

      // Step 1: Fetch existing users from auth table
      addLog('info', 'Fetching existing users for team assignments...');
      const { data: existingUsers, error: usersError } = await (supabase as any)
        .rpc('get_system_users');

      let availableUsers: any[] = [];
      if (usersError) {
        addLog('warning', `Could not fetch system users: ${usersError.message}`);
        // Fallback: try to get current user and use that
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          availableUsers = [{ id: user.id, email: user.email, user_metadata: { full_name: user.user_metadata?.full_name || user.email } }];
        }
      } else if (existingUsers && Array.isArray(existingUsers)) {
        availableUsers = existingUsers;
        addLog('success', `Found ${availableUsers.length} existing users`);
      } else {
        // Fallback: get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          availableUsers = [{ id: user.id, email: user.email, user_metadata: { full_name: user.user_metadata?.full_name || user.email } }];
        }
      }

      // Step 1.5: Filter out architect users - regular projects should NOT have architect team members
      // Architects should only have access to their own architect-owned projects
      addLog('info', 'Filtering out architect users from regular project team assignments...');
      const { data: architectRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'architect');

      const architectUserIds = new Set(architectRoles?.map((r: any) => r.user_id) || []);
      const filteredUsers = availableUsers.filter((user: any) => !architectUserIds.has(user.id));
      
      if (architectUserIds.size > 0) {
        addLog('info', `Excluded ${architectUserIds.size} architect user(s) from regular project team assignments`);
      }

      if (filteredUsers.length === 0) {
        addLog('warning', 'No non-architect users available for team member assignments');
      } else {
        addLog('success', `Using ${filteredUsers.length} non-architect users for team assignments`);
      }

      // Step 2: Create project_team_members with user_ids from non-architect users only
      // NOTE: Regular projects (owner_id = NULL) should NOT include architect users as team members
      // to maintain isolation - architects only access their own architect-owned projects
      const rows: any[] = [];
      const teamTitles = ['PM Lead', 'Site Superintendent', 'Design Coordinator', 'Project Supervisor', 'Quality Lead'];
      const teamRoles = ['project_manager', 'manager', 'manager', 'supervisor', 'inspector'];

      for (const project of projects.slice(0, 4)) {
        // Assign 2-3 team members per project from filtered (non-architect) users
        const numMembers = Math.min(2 + Math.floor(Math.random() * 2), filteredUsers.length);
        const selectedUsers = [...filteredUsers]
          .sort(() => Math.random() - 0.5)
          .slice(0, numMembers);

        selectedUsers.forEach((user, idx) => {
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || `Team Member ${idx + 1}`;
          rows.push({
            project_id: project.id,
            user_name: displayName,
            role: teamRoles[idx] || 'team_member',
            title: teamTitles[idx] || 'Team Member',
            email: user.email,
            phone: `+55 11 9${Math.floor(80000000 + Math.random() * 10000000)}`,
            avatar_url: null, // Use standard avatar system with initials fallback
            sort_order: idx,
            is_visible_to_client: true,
            created_at: baseDate.toISOString(),
            updated_at: baseDate.toISOString(),
            user_id: user.id,
          });
        });
      }

      if (rows.length === 0) {
        addLog('info', 'No projects available for client portal team');
        return [];
      }

      const { data, error } = await supabase.from('project_team_members').insert(rows).select();
      if (error) {
        throw new Error(`Failed to seed project team members: ${error.message}`);
      }

      for (const member of data || []) {
        await registerSeedRecord('project_team_members', member.id, batchId);
      }

      const membersWithUsers = data?.filter(m => m.user_id !== null).length || 0;
      addLog('success', `Seeded ${data?.length || 0} project team members (${membersWithUsers} with user accounts)`);
      return data || [];
    };

    const seedClientPortalSchedule = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal schedule events...', 'Client Portal');
      const eventTypes = [
        { title: 'Foundation milestone', type: 'milestone', offsetDays: 0, location: 'Site A' },
        { title: 'Structural inspection', type: 'inspection', offsetDays: 7, location: 'Site B' },
        { title: 'Client review meeting', type: 'meeting', offsetDays: 14, location: 'Conference Room' },
        { title: 'Delivery deadline', type: 'deadline', offsetDays: 21, location: 'Head Office' },
      ];
      const rows: any[] = [];
      const baseDate = getDemoDate();

      for (const project of projects.slice(0, 3)) {
        eventTypes.forEach((event, idx) => {
          const eventDate = getDemoDate(event.offsetDays + idx);
          rows.push({
            project_id: project.id,
            title: event.title,
            type: event.type,
            event_date: formatDateOnly(eventDate),
            event_time: formatTimeOnly(getDemoDate(event.offsetDays + idx)),
            all_day: false,
            description: `${event.title} for ${project.name}`,
            location: event.location,
            created_by: null,
            created_at: baseDate.toISOString(),
            updated_at: baseDate.toISOString(),
          });
        });
      }

      if (rows.length === 0) {
        addLog('info', 'Skipping schedule seeding (no projects)');
        return [];
      }

      const { data, error } = await supabase.from('schedule_events').insert(rows).select();
      if (error) {
        throw new Error(`Failed to seed schedule events: ${error.message}`);
      }

      for (const event of data || []) {
        await registerSeedRecord('schedule_events', event.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} schedule events`);
      return data || [];
    };

    const seedClientPortalTasks = async (projects: any[], teamMembers: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal tasks...', 'Client Portal');
      const taskTemplates = [
        { name: 'Confirm finishing materials', status: 'in-progress', priority: 'high' },
        { name: 'Share updated site photos', status: 'pending', priority: 'medium' },
        { name: 'Review payment schedule', status: 'pending', priority: 'low' },
      ];
      const rows: any[] = [];
      const baseDate = getDemoDate();
      const membersByProject = teamMembers.reduce((acc, member) => {
        acc[member.project_id] = acc[member.project_id] || [];
        acc[member.project_id].push(member);
        return acc;
      }, {} as Record<string, any[]>);

      for (const project of projects.slice(0, 3)) {
        const members = membersByProject[project.id] || [];
        const assignedTo = members[0]?.id || null;

        taskTemplates.forEach((template, idx) => {
          const dueDate = getDemoDate(idx * 3);
          rows.push({
            project_id: project.id,
            name: template.name,
            description: `${template.name} for ${project.name}`,
            status: template.status,
            priority: template.priority,
            due_date: formatDateOnly(dueDate),
            assigned_to: assignedTo,
            created_by: null,
            created_at: baseDate.toISOString(),
            updated_at: baseDate.toISOString(),
            completed_at: template.status === 'completed' ? dueDate.toISOString() : null,
          });
        });
      }

      if (rows.length === 0) {
        addLog('info', 'Skipping client portal tasks (no projects)');
        return [];
      }

      const { data, error } = await supabase.from('client_tasks').insert(rows).select();
      if (error) {
        throw new Error(`Failed to seed client tasks: ${error.message}`);
      }

      for (const task of data || []) {
        await registerSeedRecord('client_tasks', task.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} client tasks`);
      return data || [];
    };

    const seedClientPortalMeetings = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal meetings...', 'Client Portal');
      const rows: any[] = [];
      const baseDate = getDemoDate();

      projects.slice(0, 3).forEach((project, idx) => {
        const meetingDate = getDemoDate(idx * 5);
        rows.push({
          project_id: project.id,
          title: `Client check-in ${idx + 1}`,
          meeting_date: meetingDate.toISOString(),
          duration: 60,
          location: 'Conference Room',
          meeting_link: `https://meet.example.com/${project.id}`,
          status: 'upcoming',
          notes: `Discussing next phase for ${project.name}`,
          created_by: null,
          created_at: baseDate.toISOString(),
          updated_at: baseDate.toISOString(),
        });
      });

      if (rows.length === 0) {
        addLog('info', 'No meetings to seed');
        return { meetings: [], attendees: [] };
      }

      const { data: meetings, error: meetingsError } = await supabase.from('client_meetings').insert(rows).select();
      if (meetingsError) {
        throw new Error(`Failed to seed client meetings: ${meetingsError.message}`);
      }

      const attendees = [];
      meetings?.forEach((meeting) => {
        attendees.push({
          meeting_id: meeting.id,
          name: 'Cliente Portal Attendee',
          role: 'Client Representative',
          email: 'guest@example.com',
          avatar_url: null, // Use standard avatar system with initials fallback
          created_at: baseDate.toISOString(),
        });
      });

      let insertedAttendees: any[] = [];
      if (attendees.length > 0) {
        try {
          const { data: attendeeData, error: attendeeError } = await supabase
            .from('meeting_attendees')
            .insert(attendees)
            .select();
          if (attendeeError) {
            // Check if it's an RLS policy error - these are expected and we can skip
            if (attendeeError.message.includes('row-level security') || attendeeError.message.includes('RLS')) {
              addLog('warning', `Skipping meeting attendees seeding: RLS policy prevents insertion (this is expected)`);
            } else {
              throw new Error(`Failed to seed meeting attendees: ${attendeeError.message}`);
            }
          } else {
            insertedAttendees = attendeeData || [];
            for (const attendee of insertedAttendees) {
              await registerSeedRecord('meeting_attendees', attendee.id, batchId);
            }
          }
        } catch (err: any) {
          // Handle RLS violations gracefully
          if (err.message.includes('row-level security') || err.message.includes('RLS')) {
            addLog('warning', `Skipping meeting attendees seeding: RLS policy prevents insertion`);
          } else {
            throw err;
          }
        }
      }

      for (const meeting of meetings || []) {
        await registerSeedRecord('client_meetings', meeting.id, batchId);
      }

      addLog('success', `Seeded ${meetings?.length || 0} meetings and ${insertedAttendees.length} attendees`);
      return { meetings: meetings || [], attendees: insertedAttendees };
    };

    const seedClientPortalCommunication = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal communications...', 'Client Portal');
      const baseDate = getDemoDate();
      const logs: any[] = [];

      projects.slice(0, 3).forEach((project, idx) => {
        logs.push({
          project_id: project.id,
          type: idx % 2 === 0 ? 'email' : 'message',
          date_time: getDemoDate(idx * 4).toISOString(),
          subject: `Communication update ${idx + 1}`,
          description: `Summary for ${project.name}`,
          created_by: null,
          created_at: baseDate.toISOString(),
          updated_at: baseDate.toISOString(),
        });
      });

      if (logs.length === 0) {
        return { logs: [], participants: [], attachments: [] };
      }

      const { data: insertedLogs, error } = await supabase.from('communication_logs').insert(logs).select();
      if (error) {
        throw new Error(`Failed to seed communication logs: ${error.message}`);
      }

      const participants: any[] = [];
      const attachments: any[] = [];
      const hasParticipantRoleColumn = await hasColumn('communication_participants', 'role');

      const buildParticipant = (displayName: string, avatarSeed: string, logId: string) => {
        const participant: Record<string, unknown> = {
          communication_id: logId,
          name: displayName,
          avatar_url: null, // Use standard avatar system with initials fallback
          created_at: baseDate.toISOString(),
        };

        if (hasParticipantRoleColumn) {
          participant.role = displayName === 'Project Manager' ? 'Manager' : 'Client';
        }

        return participant;
      };

      insertedLogs?.forEach((log, idx) => {
        participants.push(
          buildParticipant('Project Manager', `comm${idx}`, log.id),
          buildParticipant('Client Representative', `client${idx}`, log.id)
        );

        attachments.push({
          communication_id: log.id,
          name: 'Project Brief.pdf',
          url: `https://example.com/briefs/${log.id}.pdf`,
          size: 512000,
          type: 'application/pdf',
          created_at: baseDate.toISOString(),
        });
      });

      let insertedParticipants: any[] = [];
      if (participants.length > 0) {
        const { data: participantData, error: participantError } = await supabase
          .from('communication_participants')
          .insert(participants)
          .select();
        if (participantError) {
          throw new Error(`Failed to seed communication participants: ${participantError.message}`);
        }
        insertedParticipants = participantData || [];
        for (const participant of insertedParticipants) {
          await registerSeedRecord('communication_participants', participant.id, batchId);
        }
      }

      let insertedAttachments: any[] = [];
      if (attachments.length > 0) {
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('communication_attachments')
          .insert(attachments)
          .select();
        if (attachmentError) {
          throw new Error(`Failed to seed communication attachments: ${attachmentError.message}`);
        }
        insertedAttachments = attachmentData || [];
        for (const attachment of insertedAttachments) {
          await registerSeedRecord('communication_attachments', attachment.id, batchId);
        }
      }

      for (const log of insertedLogs || []) {
        await registerSeedRecord('communication_logs', log.id, batchId);
      }

      addLog('success', `Seeded ${insertedLogs?.length || 0} communications`);
      return {
        logs: insertedLogs || [],
        participants: insertedParticipants,
        attachments: insertedAttachments,
      };
    };

    const seedClientPortalChat = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding client portal chat data...', 'Client Portal');
      const baseDate = getDemoDate();
      const conversations: any[] = [];

      projects.slice(0, 3).forEach((project, idx) => {
        conversations.push({
          project_id: project.id,
          title: `${project.name} Chat`,
          created_at: baseDate.toISOString(),
          updated_at: baseDate.toISOString(),
        });
      });

      if (conversations.length === 0) {
        return { conversations: [], participants: [], messages: [], attachments: [] };
      }

      const { data: insertedConversations, error: convoError } = await supabase
        .from('chat_conversations')
        .insert(conversations)
        .select();
      if (convoError) {
        throw new Error(`Failed to seed chat conversations: ${convoError.message}`);
      }

      const participants: any[] = [];
      const messages: any[] = [];
      const attachments: any[] = [];

      insertedConversations?.forEach((conversation, idx) => {
        participants.push(
          {
            conversation_id: conversation.id,
            user_id: null,
            is_client: true,
            joined_at: baseDate.toISOString(),
            last_read_at: baseDate.toISOString(),
          },
          {
            conversation_id: conversation.id,
            user_id: null,
            is_client: false,
            joined_at: baseDate.toISOString(),
            last_read_at: baseDate.toISOString(),
          }
        );

        const firstMessageId = crypto.randomUUID();
        messages.push(
          {
            conversation_id: conversation.id,
            sender_id: null,
            text: `Hello from the client portal for ${conversation.title}`,
            created_at: baseDate.toISOString(),
            updated_at: baseDate.toISOString(),
            read: true,
            id: firstMessageId,
          },
          {
            conversation_id: conversation.id,
            sender_id: null,
            text: 'Thanks, we are reviewing the updates.',
            created_at: getDemoDate(1).toISOString(),
            updated_at: getDemoDate(1).toISOString(),
            read: false,
            id: crypto.randomUUID(),
          }
        );

        attachments.push({
          message_id: firstMessageId,
          name: 'Site Plan.png',
          url: `https://example.com/site-plans/${conversation.id}.png`,
          type: 'image/png',
          size: 256000,
          created_at: baseDate.toISOString(),
        });
      });

      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participants)
        .select();
      if (participantError) {
        throw new Error(`Failed to seed conversation participants: ${participantError.message}`);
      }

      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert(messages)
        .select();
      if (messageError) {
        throw new Error(`Failed to seed chat messages: ${messageError.message}`);
      }

      const { data: attachmentData, error: attachmentError } = await supabase
        .from('message_attachments')
        .insert(attachments)
        .select();
      if (attachmentError) {
        throw new Error(`Failed to seed message attachments: ${attachmentError.message}`);
      }

      for (const record of insertedConversations || []) {
        await registerSeedRecord('chat_conversations', record.id, batchId);
      }
      for (const participant of participantData || []) {
        await registerSeedRecord('conversation_participants', participant.id, batchId);
      }
      for (const message of messageData || []) {
        await registerSeedRecord('chat_messages', message.id, batchId);
      }
      for (const attachment of attachmentData || []) {
        await registerSeedRecord('message_attachments', attachment.id, batchId);
      }

      addLog('success', `Seeded ${insertedConversations?.length || 0} chat conversations`);
      return {
        conversations: insertedConversations || [],
        participants: participantData || [],
        messages: messageData || [],
        attachments: attachmentData || [],
      };
    };

    // Step 39: Seed outbound campaigns (marketing)
    const seedOutboundCampaigns = async (clients: any[], suppliers: any[], contractors: any[], batchId: string) => {
      addLog('phase', 'Seeding outbound campaigns...', 'Step 39');

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        addLog('info', 'Skipping campaigns (no user ID available)');
        return { campaigns: [], recipients: [], logs: [] };
      }

      const campaigns = [
        {
          user_id: userId,
          name: 'Lançamento Residencial VIP',
          description: 'Campanha de WhatsApp para clientes VIP sobre novos empreendimentos residenciais',
          status: 'completed',
          audience_type: 'manual',
          audience_filter: { contactTypes: ['client'], vipOnly: true },
          message_template: 'Olá {{name}}, temos um novo lançamento residencial que combina sustentabilidade e luxo.',
          include_voice_for_vip: true,
          company_name: 'CastorWorks',
          scheduled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          total_recipients: 0,
          messages_sent: 0,
          messages_delivered: 0,
          messages_failed: 0,
          voice_messages_sent: 0,
        },
        {
          user_id: userId,
          name: 'Fornecedores Premium',
          description: 'Campanha para fornecedores sobre novos pedidos e parcerias',
          status: 'sending',
          audience_type: 'manual',
          audience_filter: { contactTypes: ['supplier'] },
          message_template: 'Olá {{name}}, precisamos da sua cotação para materiais premium neste mês.',
          include_voice_for_vip: false,
          company_name: 'CastorWorks',
          scheduled_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          total_recipients: 0,
          messages_sent: 0,
          messages_delivered: 0,
          messages_failed: 0,
          voice_messages_sent: 0,
        },
        {
          user_id: userId,
          name: 'Rede de Prestadores',
          description: 'Campanha para prestadores e contractors sobre cronograma de obras',
          status: 'scheduled',
          audience_type: 'manual',
          audience_filter: { contactTypes: ['contractor'] },
          message_template: 'Olá {{name}}, confira o cronograma atualizado e novas oportunidades.',
          include_voice_for_vip: false,
          company_name: 'CastorWorks',
          scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          total_recipients: 0,
          messages_sent: 0,
          messages_delivered: 0,
          messages_failed: 0,
          voice_messages_sent: 0,
        },
      ];

      const { data: insertedCampaigns, error: campaignsError } = await (supabase as any)
        .from('outbound_campaigns')
        .insert(campaigns)
        .select();
      if (campaignsError) {
        throw new Error(`Failed to seed outbound campaigns: ${campaignsError.message}`);
      }

      for (const c of insertedCampaigns || []) {
        await registerSeedRecord('outbound_campaigns', c.id, batchId);
      }

      const recipients: any[] = [];
      const recipientSources = [
        ...(clients || []).map(c => ({ type: 'client', id: c.id, name: c.name || 'Cliente', phone: c.phone || '+55 11 90000-0000', email: c.email || null, is_vip: !!c.is_vip })),
        ...(suppliers || []).map(s => ({ type: 'supplier', id: s.id, name: s.name || 'Fornecedor', phone: s.contact_phone || '+55 11 98888-0000', email: s.contact_email || null, is_vip: !!s.is_vip })),
        ...(contractors || []).map(ct => ({ type: 'contractor', id: ct.id, name: ct.name || 'Prestador', phone: ct.phone || '+55 11 97777-0000', email: ct.email || null, is_vip: !!ct.is_vip })),
      ];

      const safePhone = (phone?: string | null) => phone && phone.trim().length > 0 ? phone : '+55 11 95555-0000';

      for (const campaign of insertedCampaigns || []) {
        const slice = recipientSources.slice(0, Math.min(12, recipientSources.length));
        for (const rec of slice) {
          recipients.push({
            campaign_id: campaign.id,
            contact_type: rec.type,
            contact_id: rec.id,
            contact_name: rec.name,
            contact_phone: safePhone(rec.phone),
            contact_email: rec.email,
            is_vip: rec.is_vip || false,
            status: campaign.status === 'completed' ? 'delivered' : 'pending',
            personalized_message: `Olá ${rec.name}, ${campaign.message_template?.slice(0, 60) || 'Mensagem personalizada'}`,
            personalized_at: campaign.status === 'completed' ? new Date().toISOString() : null,
            sent_at: campaign.status === 'completed' ? new Date().toISOString() : null,
            delivered_at: campaign.status === 'completed' ? new Date().toISOString() : null,
          });
        }
      }

      const { data: insertedRecipients, error: recipientsError } = await (supabase as any)
        .from('campaign_recipients')
        .insert(recipients)
        .select();
      if (recipientsError) {
        throw new Error(`Failed to seed campaign recipients: ${recipientsError.message}`);
      }

      for (const r of insertedRecipients || []) {
        await registerSeedRecord('campaign_recipients', r.id, batchId);
      }

      // Basic logs for first campaign
      const logs: any[] = [];
      if (insertedCampaigns && insertedCampaigns.length > 0) {
        const first = insertedCampaigns[0];
        logs.push(
          {
            campaign_id: first.id,
            log_level: 'info',
            event_type: 'campaign_created',
            message: 'Campanha criada com sucesso',
            metadata: { created_by: userId },
          },
          {
            campaign_id: first.id,
            log_level: 'success',
            event_type: 'messages_sent',
            message: 'Mensagens enviadas para destinatários VIP',
            metadata: { sent: 10 },
          }
        );
      }

      if (logs.length > 0) {
        const { data: insertedLogs, error: logsError } = await (supabase as any)
          .from('campaign_logs')
          .insert(logs)
          .select();
        if (logsError) {
          throw new Error(`Failed to seed campaign logs: ${logsError.message}`);
        }

        for (const log of insertedLogs || []) {
          await registerSeedRecord('campaign_logs', log.id, batchId);
        }
      }

      addLog('success', `Seeded ${insertedCampaigns?.length || 0} outbound campaigns with ${insertedRecipients?.length || 0} recipients`);
      return {
        campaigns: insertedCampaigns || [],
        recipients: insertedRecipients || [],
        logs,
      };
    };

    // Step 37: Seed project folders
    const seedProjectFolders = async (projects: any[], clients: any[], batchId: string) => {
      addLog('phase', 'Seeding project folders...', 'Step 37');

      const hasTable = await hasColumn('project_folders', 'id');
      if (!hasTable) {
        addLog('info', 'project_folders table not available. Skipping project folders seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        addLog('warning', 'No authenticated user. Skipping project folders seeding.');
        return [];
      }

      const folders = [];
      const folderAccess = [];

      for (const project of projects) {
        const numFolders = 3 + Math.floor(Math.random() * 4);
        const folderNames = ['Documentos Gerais', 'Planejamento', 'Fotos', 'Contratos', 'Orçamentos', 'Relatórios'];
        
        for (let i = 0; i < numFolders && i < folderNames.length; i++) {
          const folder = {
            project_id: project.id,
            folder_name: folderNames[i],
            folder_type: i === 0 ? 'shared' : ['shared', 'client'][Math.floor(Math.random() * 2)],
            description: `Pasta para ${folderNames[i]} do projeto ${project.name}`,
            client_accessible: i === 0 || Math.random() > 0.5,
            created_by: userId,
            is_deleted: false,
          };
          folders.push(folder);
        }
      }

      const { data, error } = await supabase.from('project_folders').insert(folders).select();
      if (error) {
        addLog('error', `Failed to seed project folders: ${error.message}`);
        return [];
      }

      // Seed folder client access for folders marked as client_accessible
      for (const folder of data || []) {
        await registerSeedRecord('project_folders', folder.id, batchId);
        
        if (folder.client_accessible) {
          const project = projects.find(p => p.id === folder.project_id);
          if (project?.client_id) {
            folderAccess.push({
              folder_id: folder.id,
              client_id: project.client_id,
              access_granted: true,
            });
          }
        }
      }

      // Insert folder client access records
      if (folderAccess.length > 0) {
        const { data: accessData, error: accessError } = await supabase
          .from('folder_client_access')
          .insert(folderAccess)
          .select();
        
        if (accessError) {
          addLog('warning', `Failed to seed folder client access: ${accessError.message}`);
        } else {
          for (const access of accessData || []) {
            await registerSeedRecord('folder_client_access', access.id, batchId);
          }
        }
      }

      addLog('success', `Seeded ${data?.length || 0} project folders`);
      return data || [];
    };

    // Step 38: Seed notifications
    const seedNotifications = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding notifications...', 'Step 38');

      const hasTable = await hasColumn('notifications', 'id');
      if (!hasTable) {
        addLog('info', 'notifications table not available. Skipping notifications seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        addLog('warning', 'No authenticated user. Skipping notifications seeding.');
        return [];
      }

      const notifications = [];
      const notificationTypes = ['financial_alert', 'project_update', 'schedule_change', 'material_delivery', 'system', 'budget_overrun', 'milestone_delay'];
      const priorities = ['low', 'medium', 'high'];
      const baseDate = getDemoDate();

      for (const project of projects.slice(0, Math.min(3, projects.length))) {
        const numNotifications = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numNotifications; i++) {
          const notificationDate = new Date(baseDate);
          notificationDate.setDate(notificationDate.getDate() - Math.floor(Math.random() * 7));
          
          const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
          const priority = priorities[Math.floor(Math.random() * priorities.length)];
          
          notifications.push({
            user_id: userId,
            type,
            title: `Notificação ${i + 1} - ${project.name}`,
            message: `Atualização sobre o projeto ${project.name}`,
            priority,
            read: Math.random() > 0.5,
            archived: false,
            action_url: `/projects/${project.id}`,
            data: { projectId: project.id },
            created_at: notificationDate.toISOString(),
          });
        }
      }

      const { data, error } = await supabase.from('notifications').insert(notifications).select();
      if (error) {
        addLog('error', `Failed to seed notifications: ${error.message}`);
        return [];
      }

      for (const notification of data || []) {
        await registerSeedRecord('notifications', notification.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} notifications`);
      return data || [];
    };

    // Step 40: Seed invoices
    const seedInvoices = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding invoices...', 'Step 40');

      const hasTable = await hasColumn('invoices', 'id');
      if (!hasTable) {
        addLog('info', 'invoices table not available. Skipping invoices seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const baseDate = getDemoDate();
      const invoiceStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected'];
      const invoices = [];
      let invoiceNumber = 1000;

      for (const project of projects.slice(0, Math.min(3, projects.length))) {
        const numInvoices = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numInvoices; i++) {
          const issueDate = new Date(baseDate);
          issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 30));
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + 30);
          
          invoices.push({
            invoice_number: `INV-${invoiceNumber++}`,
            project_id: project.id,
            project_name: project.name,
            issue_date: issueDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            amount: project.budget_total * (0.1 + Math.random() * 0.3),
            status: invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)],
            description: `Fatura referente ao projeto ${project.name}`,
            created_by: userId,
            created_at: issueDate.toISOString(),
          });
        }
      }

      const { data, error } = await supabase.from('invoices').insert(invoices).select();
      if (error) {
        addLog('error', `Failed to seed invoices: ${error.message}`);
        return [];
      }

      for (const invoice of data || []) {
        await registerSeedRecord('invoices', invoice.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} invoices`);
      return data || [];
    };

    // Step 40: Seed contacts
    const seedContacts = async (batchId: string) => {
      addLog('phase', 'Seeding contacts...', 'Step 40');

      const hasTable = await hasColumn('contacts', 'id');
      if (!hasTable) {
        addLog('info', 'contacts table not available. Skipping contacts seeding.');
        return [];
      }

      const contacts = [
        {
          full_name: 'João Silva',
          email: 'joao.silva@example.com',
          phone_number: '+55 11 98765-4321',
          address: 'Rua das Flores, 123',
          city: 'São Paulo',
          zip_code: '01234-567',
          company: 'Silva Construções',
          role: 'subcontractor',
          notes: 'Especialista em alvenaria',
        },
        {
          full_name: 'Maria Santos',
          email: 'maria.santos@example.com',
          phone_number: '+55 21 97654-3210',
          address: 'Av. Atlântica, 456',
          city: 'Rio de Janeiro',
          zip_code: '22010-000',
          company: 'Santos Engenharia',
          role: 'supplier',
          notes: 'Fornecedor de materiais elétricos',
        },
        {
          full_name: 'Pedro Oliveira',
          email: 'pedro.oliveira@example.com',
          phone_number: '+55 85 96543-2109',
          address: 'Rua do Comércio, 789',
          city: 'Fortaleza',
          zip_code: '60060-100',
          company: 'Oliveira Instalações',
          role: 'subcontractor',
          notes: 'Instalações hidráulicas e elétricas',
        },
      ];

      const { data, error } = await supabase.from('contacts').insert(contacts).select();
      if (error) {
        addLog('error', `Failed to seed contacts: ${error.message}`);
        return [];
      }

      for (const contact of data || []) {
        await registerSeedRecord('contacts', contact.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} contacts`);
      return data || [];
    };

    // Step 41: Seed project WBS nodes
    const seedProjectWBSNodes = async (projects: any[], batchId: string) => {
      addLog('phase', 'Seeding project WBS nodes...', 'Step 41');

      const hasTable = await hasColumn('project_wbs_nodes', 'id');
      if (!hasTable) {
        addLog('info', 'project_wbs_nodes table not available. Skipping WBS nodes seeding.');
        return [];
      }

      const wbsNodes = [];
      const wbsStructure = [
        { code: '01', title: 'Preparação do Terreno', level: 1 },
        { code: '02', title: 'Fundação', level: 1 },
        { code: '03', title: 'Estrutura', level: 1 },
        { code: '04', title: 'Vedação', level: 1 },
        { code: '05', title: 'Instalações', level: 1 },
      ];

      for (const project of projects) {
        const parentId: string | null = null;
        for (let i = 0; i < Math.min(5, wbsStructure.length); i++) {
          const node = {
            project_id: project.id,
            parent_id: i === 0 ? null : parentId,
            code: wbsStructure[i].code,
            title: wbsStructure[i].title,
            description: `${wbsStructure[i].title} para ${project.name}`,
            level: wbsStructure[i].level,
          };
          wbsNodes.push(node);
        }
      }

      // Insert nodes one by one to maintain parent-child relationships
      const insertedNodes = [];
      for (const node of wbsNodes) {
        const { data, error } = await supabase.from('project_wbs_nodes').insert(node).select();
        if (error) {
          addLog('warning', `Failed to seed WBS node ${node.code}: ${error.message}`);
          continue;
        }
        if (data && data[0]) {
          insertedNodes.push(data[0]);
          await registerSeedRecord('project_wbs_nodes', data[0].id, batchId);
          // Update parent_id for next nodes
          if (wbsNodes.indexOf(node) === 0) {
            const nextNode = wbsNodes[wbsNodes.indexOf(node) + 1];
            if (nextNode) {
              nextNode.parent_id = data[0].id;
            }
          }
        }
      }

      addLog('success', `Seeded ${insertedNodes.length} project WBS nodes`);
      return insertedNodes;
    };

    // Step 42: Seed project budgets
    const seedProjectBudgets = async (projects: any[], phases: any[], batchId: string) => {
      addLog('phase', 'Seeding project budgets...', 'Step 42');

      const hasTable = await hasColumn('project_budgets', 'id');
      if (!hasTable) {
        addLog('info', 'project_budgets table not available. Skipping project budgets seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const budgets = [];
      const budgetLineItems = [];

      for (const project of projects.slice(0, Math.min(2, projects.length))) {
        const budget = {
          project_id: project.id,
          name: `Orçamento Principal - ${project.name}`,
          description: `Orçamento detalhado para ${project.name}`,
          budget_model: ['simple', 'bdi_brazil', 'cost_control'][Math.floor(Math.random() * 3)], // Column renamed from budget_type to budget_model
          status: ['draft', 'review', 'approved'][Math.floor(Math.random() * 3)],
          created_by: userId,
        };
        budgets.push(budget);
      }

      const { data: budgetData, error: budgetError } = await supabase
        .from('project_budgets')
        .insert(budgets)
        .select();
      
      if (budgetError) {
        addLog('error', `Failed to seed project budgets: ${budgetError.message}`);
        return [];
      }

      // Seed budget line items for each budget
      for (const budget of budgetData || []) {
        await registerSeedRecord('project_budgets', budget.id, batchId);
        
        const projectPhases = phases.filter(p => p.project_id === budget.project_id);
        const numItems = 5 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < numItems; i++) {
          const phase = projectPhases[Math.floor(Math.random() * projectPhases.length)] || null;
          budgetLineItems.push({
            budget_id: budget.id,
            phase_id: phase?.id || null,
            sinapi_code: `SINAPI-${1000 + i}`,
            item_number: `${i + 1}`,
            description: `Item de orçamento ${i + 1}`,
            unit: ['m²', 'm³', 'un', 'kg'][Math.floor(Math.random() * 4)],
            unit_cost_material: 10 + Math.random() * 100,
            unit_cost_labor: 20 + Math.random() * 150,
            quantity: 1 + Math.random() * 100,
            sort_order: i,
          });
        }
      }

      // Insert budget line items
      if (budgetLineItems.length > 0) {
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('budget_line_items')
          .insert(budgetLineItems)
          .select();
        
        if (lineItemsError) {
          addLog('warning', `Failed to seed budget line items: ${lineItemsError.message}`);
        } else {
          for (const item of lineItemsData || []) {
            await registerSeedRecord('budget_line_items', item.id, batchId);
          }
        }
      }

      addLog('success', `Seeded ${budgetData?.length || 0} project budgets`);
      return budgetData || [];
    };

    // Step 43: Seed recurring expense patterns
    const seedRecurringExpensePatterns = async (projects: any[], wbsNodes: any[], batchId: string) => {
      addLog('phase', 'Seeding recurring expense patterns...', 'Step 43');

      const hasTable = await hasColumn('recurring_expense_patterns', 'id');
      if (!hasTable) {
        addLog('info', 'recurring_expense_patterns table not available. Skipping recurring expense patterns seeding.');
        return [];
      }

      const patterns = [];
      const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];
      const baseDate = getDemoDate();

      for (const project of projects.slice(0, Math.min(2, projects.length))) {
        const numPatterns = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numPatterns; i++) {
          const startDate = new Date(baseDate);
          startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 6);
          
          // Only set wbs_node_id if we can verify the WBS node exists in the database
          // Skip wbs_node_id for seeding to avoid FK constraint violations
          // (The foreign key references project_wbs_items, and we can't guarantee the IDs match)
          patterns.push({
            project_id: project.id,
            description: `Despesa recorrente ${i + 1} - ${project.name}`,
            amount: 1000 + Math.random() * 5000,
            frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            wbs_node_id: null, // Set to null to avoid FK constraint violations during seeding
          });
        }
      }

      const { data, error } = await supabase.from('recurring_expense_patterns').insert(patterns).select();
      if (error) {
        addLog('error', `Failed to seed recurring expense patterns: ${error.message}`);
        return [];
      }

      for (const pattern of data || []) {
        await registerSeedRecord('recurring_expense_patterns', pattern.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} recurring expense patterns`);
      return data || [];
    };

    // Step 45: Seed proposals
    const seedProposals = async (estimates: any[], batchId: string) => {
      addLog('phase', 'Seeding proposals...', 'Step 45');

      const hasTable = await hasColumn('proposals', 'id');
      if (!hasTable) {
        addLog('info', 'proposals table not available. Skipping proposals seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        addLog('warning', 'No authenticated user. Skipping proposals seeding.');
        return [];
      }

      const proposals = [];
      const statuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected'];
      const templates = ['standard', 'modern', 'detailed'];
      const baseDate = getDemoDate();

      for (const estimate of estimates.slice(0, Math.min(3, estimates.length))) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const proposal = {
          estimate_id: estimate.id,
          user_id: userId,
          status,
          template_name: templates[Math.floor(Math.random() * templates.length)],
          cover_letter: `Carta de apresentação para o projeto ${estimate.name}`,
          scope_of_work: 'Escopo detalhado do trabalho a ser realizado',
          exclusions: 'Itens não incluídos no escopo',
          payment_terms: 'Pagamento em 3 parcelas',
          timeline: 'Prazo de execução: 6 meses',
          warranty: 'Garantia de 12 meses',
          terms_and_conditions: 'Termos e condições padrão',
          ai_generated_sections: { cover_letter: true, scope_of_work: false },
          created_at: baseDate.toISOString(),
        };
        proposals.push(proposal);
      }

      const { data, error } = await supabase.from('proposals').insert(proposals).select();
      if (error) {
        addLog('error', `Failed to seed proposals: ${error.message}`);
        return [];
      }

      for (const proposal of data || []) {
        await registerSeedRecord('proposals', proposal.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} proposals`);
      return data || [];
    };

    // Step 46: Seed schedule scenarios
    const seedScheduleScenarios = async (projects: any[], activities: any[], phases: any[], batchId: string) => {
      addLog('phase', 'Seeding schedule scenarios...', 'Step 46');

      const hasTable = await hasColumn('schedule_scenarios', 'id');
      if (!hasTable) {
        addLog('info', 'schedule_scenarios table not available. Skipping schedule scenarios seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const scenarios = [];
      const scenarioActivities = [];

      for (const project of projects.slice(0, Math.min(2, projects.length))) {
        const numScenarios = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numScenarios; i++) {
          const scenario = {
            project_id: project.id,
            scenario_name: `Cenário ${i + 1} - ${project.name}`,
            description: `Cenário de planejamento alternativo`,
            is_active: i === 0,
            is_baseline: i === 0,
            created_by: userId,
          };
          scenarios.push(scenario);
        }
      }

      const { data: scenarioData, error: scenarioError } = await supabase
        .from('schedule_scenarios')
        .insert(scenarios)
        .select();
      
      if (scenarioError) {
        addLog('error', `Failed to seed schedule scenarios: ${scenarioError.message}`);
        return [];
      }

      // Seed scenario activities for each scenario
      for (const scenario of scenarioData || []) {
        await registerSeedRecord('schedule_scenarios', scenario.id, batchId);
        
        const projectActivities = activities.filter(a => {
          const phase = phases.find(p => p.id === a.phase_id);
          return phase?.project_id === scenario.project_id;
        });
        
        const numActivities = Math.min(5, projectActivities.length);
        for (let i = 0; i < numActivities; i++) {
          const activity = projectActivities[i];
          if (activity) {
            scenarioActivities.push({
              scenario_id: scenario.id,
              activity_data: {
                activity_id: activity.id,
                name: activity.activity_name,
                start_date: activity.start_date,
                end_date: activity.end_date,
                duration: activity.duration_days,
              },
            });
          }
        }
      }

      // Insert scenario activities
      if (scenarioActivities.length > 0) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('scenario_activities')
          .insert(scenarioActivities)
          .select();
        
        if (activitiesError) {
          addLog('warning', `Failed to seed scenario activities: ${activitiesError.message}`);
        } else {
          for (const activity of activitiesData || []) {
            await registerSeedRecord('scenario_activities', activity.id, batchId);
          }
        }
      }

      addLog('success', `Seeded ${scenarioData?.length || 0} schedule scenarios`);
      return scenarioData || [];
    };

    // Step 47: Seed estimate files
    const seedEstimateFiles = async (estimates: any[], batchId: string) => {
      addLog('phase', 'Seeding estimate files...', 'Step 47');

      const hasTable = await hasColumn('estimate_files', 'id');
      if (!hasTable) {
        addLog('info', 'estimate_files table not available. Skipping estimate files seeding.');
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        addLog('warning', 'No authenticated user. Skipping estimate files seeding.');
        return [];
      }

      const files = [];
      const fileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const processingStatuses = ['pending', 'processing', 'completed', 'failed'];

      for (const estimate of estimates.slice(0, Math.min(2, estimates.length))) {
        const numFiles = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numFiles; i++) {
          files.push({
            estimate_id: estimate.id,
            user_id: userId,
            filename: `arquivo_${i + 1}_${estimate.id}.pdf`,
            file_type: fileTypes[Math.floor(Math.random() * fileTypes.length)],
            file_url: `https://example.com/files/${estimate.id}/file_${i + 1}.pdf`,
            file_size: 100000 + Math.floor(Math.random() * 900000),
            processing_status: processingStatuses[Math.floor(Math.random() * processingStatuses.length)],
            ai_extracted_data: {
              rawText: 'Texto extraído do arquivo',
              dimensions: ['10m x 5m'],
              materials: ['Concreto', 'Aço'],
              quantities: [100, 50],
            },
          });
        }
      }

      const { data, error } = await supabase.from('estimate_files').insert(files).select();
      if (error) {
        addLog('error', `Failed to seed estimate files: ${error.message}`);
        return [];
      }

      for (const file of data || []) {
        await registerSeedRecord('estimate_files', file.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} estimate files`);
      return data || [];
    };

    // Main seeding function
    const executeSeeding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('User ID not found');

      // Ensure user has admin or project_manager role for seeding
      addLog('info', 'Checking user roles for seeding permissions...');
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'project_manager']);

      if (rolesError) {
        addLog('error', `Failed to check user roles: ${rolesError.message}`);
        throw new Error(`Failed to check user roles: ${rolesError.message}`);
      }

      if (!userRoles || userRoles.length === 0) {
        // Grant admin role temporarily for seeding using RPC function (bypasses RLS)
        addLog('info', 'User does not have admin/project_manager role. Granting admin role temporarily for seeding...');
        const { data: granted, error: grantError } = await supabase.rpc('grant_admin_role_for_seeding', {
          p_user_id: userId,
        });

        if (grantError || !granted) {
          addLog('error', `Failed to grant admin role: ${grantError?.message || 'Unknown error'}`);
          throw new Error(`Seeding requires admin or project_manager role. Failed to grant admin role: ${grantError?.message || 'Unknown error'}`);
        }
        addLog('success', 'Admin role granted for seeding');
      } else {
        addLog('success', `User has ${userRoles[0].role} role - proceeding with seeding`);
      }

      // Clear existing seed data first
      await clearSeedData();

      // Generate batch ID for this seeding session
      const batchId = crypto.randomUUID();

      const stats: any = {
        total: 0,
        version: 'v4.0.0',
        timestamp: new Date().toISOString(),
      };

      try {
        // Step 1: Currencies
        await seedCurrencies(batchId);

        // Step 2: Clients
        const clients = await seedClients(batchId);
        stats.clients = clients.length;

        // Step 3: Suppliers
        const suppliers = await seedSuppliers(batchId);
        stats.suppliers = suppliers.length;

        // Step 3.5: Contractors
        const contractors = await seedContractors(batchId);
        stats.contractors = contractors.length;

        // Step 4: Projects
        const projects = await seedProjects(clients, batchId);
        stats.projects = projects.length;

        // Step 5: Project Phases
        const phases = await seedProjectPhases(projects, batchId);
        stats.project_phases = phases.length;

        // Step 6: Project Activities
        const activities = await seedProjectActivities(phases, batchId);
        stats.project_activities = activities.length;

        // Step 7: Project Milestones
        const milestones = await seedProjectMilestones(projects, batchId);
        stats.project_milestones = milestones.length;

        // Step 8: Project Resources
        const resources = await seedProjectResources(projects, batchId);
        stats.project_resources = resources.length;

        // Step 9: Project Materials
        const materials = await seedProjectMaterials(projects, batchId);
        stats.project_materials = materials.length;

        // Step 10: Project Budget Items
        const budgetItems = await seedProjectBudgetItems(projects, phases, batchId);
        stats.project_budget_items = budgetItems.length;

        // Step 11: Project Financial Entries
        const financialEntries = await seedProjectFinancialEntries(projects, clients, batchId);
        stats.project_financial_entries = financialEntries.length;

        // Step 12: Purchase Requests
        const purchaseRequests = await seedPurchaseRequests(projects, batchId);
        stats.purchase_requests = purchaseRequests.length;

        // Step 13: Purchase Request Items
        const purchaseRequestItems = await seedPurchaseRequestItems(purchaseRequests, batchId);
        stats.purchase_request_items = purchaseRequestItems.length;

        // Step 14: Quote Requests
        const quoteRequests = await seedQuoteRequests(purchaseRequests, suppliers, batchId);
        stats.quote_requests = quoteRequests.length;

        // Step 15: Quotes
        const quotes = await seedQuotes(purchaseRequestItems, suppliers, batchId);
        stats.quotes = quotes.length;

        // Step 15b: Quote Approvals
        const quoteApprovals = await seedQuoteApprovals(quotes, batchId);
        stats.quote_approvals = quoteApprovals.length;

        // Step 16: Purchase Orders
        const purchaseOrders = await seedPurchaseOrders(projects, quotes, suppliers, purchaseRequests, batchId);
        stats.purchase_orders = purchaseOrders.length;

        // Step 17: Delivery Confirmations
        const deliveryConfirmations = await seedDeliveryConfirmations(purchaseOrders, projects, batchId);
        stats.delivery_confirmations = deliveryConfirmations.length;

        // Step 18: Payment Transactions
        const payments = await seedPaymentTransactions(purchaseOrders, deliveryConfirmations, batchId);
        stats.payment_transactions = payments.length;

        // Step 19: Project Time Logs
        const timeLogs = await seedProjectTimeLogs(projects, activities, batchId);
        stats.time_logs = timeLogs.length;

        // Step 20: Project Daily Logs
        const dailyLogs = await seedProjectDailyLogs(projects, batchId);
        stats.daily_logs = dailyLogs.length;

        // Step 21: Activity Resource Assignments
        const assignments = await seedProjectAssignments(projects, activities, resources, batchId);
        stats.activity_resource_assignments = assignments.length;

        // Step 22: Project Income
        const income = await seedProjectIncome(projects, batchId);
        stats.project_income = income.length;

        // Step 23: Project Expenses
        const expenses = await seedProjectExpenses(projects, batchId);
        stats.project_expenses = expenses.length;

        // Step 24: Site Issues
        const siteIssues = await seedSiteIssues(projects, batchId);
        stats.site_issues = siteIssues.length;

        // Step 25: Quality Inspections
        const qualityInspections = await seedQualityInspections(projects, phases, batchId);
        stats.quality_inspections = qualityInspections.length;

        // Step 26: Project Documents
        const documents = await seedProjectDocuments(projects, batchId);
        stats.project_documents = documents.length;

        // Step 27: Project Photos
        const photos = await seedProjectPhotos(projects, batchId);
        stats.project_photos = photos.length;

        // Step 27b: Photo Comments
        const photoComments = await seedPhotoComments(photos, batchId);
        stats.photo_comments = photoComments.length;

        // Step 28: Roadmap Items
        const roadmapItems = await seedRoadmapItems(projects, batchId);
        stats.roadmap_items = roadmapItems.length;

        // Step 29: Sprints
        const sprints = await seedSprints(projects, batchId);
        stats.sprints = sprints.length;

        // Step 30: Project Estimates
        const estimates = await seedProjectEstimates(projects, clients, batchId);
        stats.estimates = estimates.length;

        // Step 31: Project Calendar Events
        const calendarEvents = await seedProjectCalendarEvents(projects, batchId);
        stats.project_calendar_events = calendarEvents.length;

        // Step 32: Cost Predictions
        const costPredictions = await seedCostPredictions(projects, batchId);
        stats.cost_predictions = costPredictions.length;

        // Step 32b: Exchange Rates
        const exchangeRates = await seedExchangeRates(batchId);
        stats.exchange_rates = exchangeRates.length;

        // Step 33: Opportunities (non-architect)
        const opportunities = await seedOpportunities(clients, batchId);
        stats.opportunities = opportunities.length;

        // Step 33c: Opportunity Briefings
        const opportunityBriefings = await seedOpportunityBriefings(opportunities, batchId);
        stats.opportunity_briefings = opportunityBriefings.length;

        // Step 33d: Opportunity Meetings
        const opportunityMeetings = await seedOpportunityMeetings(opportunities, batchId);
        stats.opportunity_meetings = opportunityMeetings.length;

        // Client Portal Section - Wrap with RLS handling
        let projectTeamMembers: any[] = [];
        try {
          projectTeamMembers = await seedClientPortalTeam(projects, batchId);
          stats.project_team_members = projectTeamMembers.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping client portal team: RLS policy prevents insertion`);
        }

        let scheduleEvents: any[] = [];
        try {
          scheduleEvents = await seedClientPortalSchedule(projects, batchId);
          stats.schedule_events = scheduleEvents.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping schedule events: RLS policy prevents insertion`);
        }

        let clientTasks: any[] = [];
        try {
          clientTasks = await seedClientPortalTasks(projects, projectTeamMembers, batchId);
          stats.client_tasks = clientTasks.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping client tasks: RLS policy prevents insertion`);
        }

        let meetings: any[] = [];
        let attendees: any[] = [];
        try {
          const result = await seedClientPortalMeetings(projects, batchId);
          meetings = result.meetings;
          attendees = result.attendees;
          stats.client_meetings = meetings.length;
          stats.meeting_attendees = attendees.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping client meetings: RLS policy prevents insertion`);
        }

        let communications: any = { logs: [], participants: [], attachments: [] };
        try {
          communications = await seedClientPortalCommunication(projects, batchId);
          stats.communication_logs = communications.logs.length;
          stats.communication_participants = communications.participants.length;
          stats.communication_attachments = communications.attachments.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping communications: RLS policy prevents insertion`);
        }

        let chats: any = { conversations: [], participants: [], messages: [], attachments: [] };
        try {
          chats = await seedClientPortalChat(projects, batchId);
          stats.chat_conversations = chats.conversations.length;
          stats.conversation_participants = chats.participants.length;
          stats.chat_messages = chats.messages.length;
          stats.message_attachments = chats.attachments.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping chat: RLS policy prevents insertion`);
        }

        // Step 37: Project Folders
        const projectFolders = await seedProjectFolders(projects, clients, batchId);
        stats.project_folders = projectFolders.length;

        // Step 38: Notifications
        const notifications = await seedNotifications(projects, batchId);
        stats.notifications = notifications.length;

        // Step 39: Outbound Campaigns
        let campaignsResult: any = { campaigns: [], recipients: [], logs: [] };
        try {
          campaignsResult = await seedOutboundCampaigns(clients, suppliers, contractors, batchId);
          stats.outbound_campaigns = campaignsResult.campaigns.length;
          stats.campaign_recipients = campaignsResult.recipients.length;
          stats.campaign_logs = campaignsResult.logs.length;
        } catch (err: any) {
          if (!err.message?.includes('row-level security') && !err.message?.includes('RLS')) throw err;
          addLog('warning', `Skipping outbound campaigns: RLS policy prevents insertion`);
        }

        // Step 40: Invoices
        const invoices = await seedInvoices(projects, batchId);
        stats.invoices = invoices.length;

        // Step 41: Contacts
        const contacts = await seedContacts(batchId);
        stats.contacts = contacts.length;

        // Step 42: Project WBS Nodes
        const wbsNodes = await seedProjectWBSNodes(projects, batchId);
        stats.project_wbs_nodes = wbsNodes.length;

        // Step 43: Project Budgets
        const projectBudgets = await seedProjectBudgets(projects, phases, batchId);
        stats.project_budgets = projectBudgets.length;

        // Step 44: Recurring Expense Patterns
        const recurringExpenses = await seedRecurringExpensePatterns(projects, wbsNodes, batchId);
        stats.recurring_expense_patterns = recurringExpenses.length;

        // Step 45: Proposals
        const proposals = await seedProposals(estimates, batchId);
        stats.proposals = proposals.length;

        // Step 46: Schedule Scenarios
        const scheduleScenarios = await seedScheduleScenarios(projects, activities, phases, batchId);
        stats.schedule_scenarios = scheduleScenarios.length;

        // Step 47: Estimate Files
        const estimateFiles = await seedEstimateFiles(estimates, batchId);
        stats.estimate_files = estimateFiles.length;

        // Calculate total
        stats.total = Object.values(stats).reduce((sum: number, val: any) => {
          return sum + (typeof val === 'number' ? val : 0);
        }, 0);

        // Save metadata
        await supabase.from('seed_data_registry').insert({
          entity_type: '_metadata',
          entity_id: crypto.randomUUID(),
          seed_batch_id: batchId,
          metadata: {
            version: stats.version,
            timestamp: stats.timestamp,
            totalRecords: stats.total,
            description: 'Comprehensive seed data generation v4.0.0',
          },
        });

        addLog('success', '✓ All seeding steps completed successfully!');
        return { stats, message: `Successfully seeded ${stats.total} records across all tables` };
      } catch (error: any) {
        addLog('error', `✗ Seeding failed: ${error.message}`);
        throw error;
      }
    };

  return { fetchDetailedStats, clearSeedData, executeSeeding };
}
