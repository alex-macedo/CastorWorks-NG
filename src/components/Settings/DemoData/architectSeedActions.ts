/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/formatters';
import { ExecutionLogEntry } from '../ExecutionLog';
import {
  architectMockClients,
  architectMockProjects,
  architectMockTasks,
  architectMockTaskComments,
  architectMockMeetings,
  architectMockOpportunities,
  architectMockMoodboardSections,
  architectMockMoodboardImages,
  architectMockMoodboardColors,
  architectMockBriefings,
  architectMockStatuses,
  architectMockDiaryEntries,
} from '@/mocks/architectMockData';
import { mapMockProjectToDbProject, mapMockClientToDbClient } from './architectSeedConfig';
import { getDemoDate } from '@/config';
import imageCompression from 'browser-image-compression';

export type LogHandler = (type: ExecutionLogEntry['type'], message: string, phase?: string) => void;

type SeedRegistryRecord = {
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  seed_batch_id?: string | null;
};

/**
 * Creates architect-specific demo data actions
 * This process seeds all architect module tables using mock data as the source of truth
 */
export function createArchitectDemoDataActions(addLog: LogHandler) {
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

  // RLS-aware insert helper that throws errors when RLS blocks inserts
  // This ensures we catch permission issues early instead of silently failing
  const insertWithRLSHandling = async (table: string, rows: any[], logHandler?: (msg: string) => void) => {
    try {
      if (logHandler) {
        logHandler(`info: Attempting to insert ${rows.length} rows into ${table}`);
      }
      
      const { data, error } = await supabase.from(table).insert(rows).select();
      
      if (error) {
        const errorMsg = `Insert failed for ${table}: ${error.message}`;
        if (logHandler) logHandler(`error: ${errorMsg}`);
        
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          const rlsErrorMsg = `RLS policy prevents insertion into ${table}. Ensure user has admin role or is added to project team members. Error: ${error.message}`;
          if (logHandler) logHandler(`error: ${rlsErrorMsg}`);
          throw new Error(rlsErrorMsg);
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        const errorMsg = `Insert into ${table} returned no data (inserted ${rows.length} rows but SELECT returned 0). This indicates an RLS policy is filtering the SELECT results.`;
        if (logHandler) {
          logHandler(`error: ${errorMsg}`);
          logHandler(`error: This means the INSERT succeeded but RLS is blocking the SELECT. Check RLS policies for ${table}.`);
        }
        throw new Error(errorMsg);
      }
      
      if (logHandler) {
        logHandler(`success: Successfully inserted and retrieved ${data.length} rows from ${table}`);
      }
      
      return data || [];
    } catch (err: any) {
      if (err.message?.includes('row-level security') || err.message?.includes('RLS')) {
        const errorMsg = `RLS policy prevents insertion into ${table}. Ensure user has admin role or is added to project team members. Error: ${err.message}`;
        if (logHandler) logHandler(`error: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      throw err;
    }
  };

  // Helper to add current user as team member with verification and retry logic
  // This is critical for RLS access when seeding architect-owned projects
  const addTeamMemberWithVerification = async (
    projectId: string, 
    currentUserId: string, 
    maxRetries: number = 3,
    delayMs: number = 500
  ): Promise<{ success: boolean; verified: boolean; error?: string }> => {
    addLog('info', `Adding team member for project ${projectId} (user: ${currentUserId})...`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Insert the team member with .select() to get the result
        const { data: insertedMember, error: insertError } = await supabase
          .from('project_team_members')
          .insert({
            project_id: projectId,
            user_id: currentUserId,
            role: 'admin',
            joined_at: new Date().toISOString(),
          })
          .select('id, project_id, user_id, role')
          .single();
        
        if (insertError) {
          // Check if it's a duplicate key error (member already exists)
          if (insertError.message?.includes('duplicate key') || insertError.code === '23505') {
            addLog('info', `Team member already exists for project ${projectId}, verifying...`);
          } else {
            addLog('warning', `Attempt ${attempt}/${maxRetries}: Failed to insert team member: ${insertError.message}`);
            if (attempt < maxRetries) {
              addLog('info', `Retrying in ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
            return { success: false, verified: false, error: insertError.message };
          }
        } else {
          addLog('info', `Successfully inserted team member (ID: ${insertedMember?.id}) for project ${projectId}`);
        }
        
        // Step 2: Wait a moment for RLS policies to "see" the new row
        if (attempt < maxRetries) {
          addLog('info', `Waiting ${delayMs}ms for RLS policy propagation...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // Step 3: Verify the team member was actually added by querying it back
        const { data: verifiedMember, error: verifyError } = await supabase
          .from('project_team_members')
          .select('id, project_id, user_id, role')
          .eq('project_id', projectId)
          .eq('user_id', currentUserId)
          .maybeSingle();
        
        if (verifyError) {
          addLog('warning', `Attempt ${attempt}/${maxRetries}: Failed to verify team member: ${verifyError.message}`);
          if (attempt < maxRetries) {
            addLog('info', `Retrying verification in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return { success: true, verified: false, error: verifyError.message };
        }
        
        if (verifiedMember) {
          addLog('success', `Verified team member exists for project ${projectId} (ID: ${verifiedMember.id}, role: ${verifiedMember.role})`);
          return { success: true, verified: true };
        } else {
          addLog('warning', `Attempt ${attempt}/${maxRetries}: Team member verification failed - not found in query`);
          if (attempt < maxRetries) {
            addLog('info', `Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return { success: true, verified: false, error: 'Team member not found after insertion' };
        }
      } catch (err: any) {
        addLog('warning', `Attempt ${attempt}/${maxRetries}: Exception adding team member: ${err.message}`);
        if (attempt < maxRetries) {
          addLog('info', `Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        return { success: false, verified: false, error: err.message };
      }
    }
    
    return { success: false, verified: false, error: 'Max retries exceeded' };
  };

  // Helper function to register seeded records with architect_ prefix
  const registerSeedRecord = async (entityType: string, entityId: string, batchId: string) => {
    // If entityType already starts with 'architect_', don't prefix again
    // This allows us to register 'architect_projects' directly
    const finalEntityType = entityType.startsWith('architect_') 
      ? entityType 
      : `architect_${entityType}`;
    
    const { error } = await supabase.from('seed_data_registry').insert({
      entity_type: finalEntityType,
      entity_id: entityId,
      seed_batch_id: batchId,
    });
    
    if (error) {
      addLog('warning', `Failed to register seed record: ${error.message}`);
      return error;
    }
    
    return null;
  };

  // Helper function to find a user with architect role
  // CRITICAL: Seeding is done by admin, but data must be owned by architect user
  // This function finds the architect user (NOT the current user running the seeding)
  const findArchitectUserId = async (): Promise<string | null> => {
    // IMPORTANT: Always find the architect user, regardless of who is running the seeding
    // The seeding process is typically run by an admin, but data must belong to the architect
    addLog('info', 'Finding architect user for data ownership (seeding run by admin)...');
    
    // Target architect user ID (provided by user)
    const TARGET_ARCHITECT_USER_ID = '1dba5c8a-7780-4dd2-a812-b29c4e22b556';
    
    // First, check if the target architect user exists and has the architect role
    const { data: targetUserRole, error: targetError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', TARGET_ARCHITECT_USER_ID)
      .eq('role', 'architect')
      .limit(1);

    if (!targetError && targetUserRole && targetUserRole.length > 0) {
      addLog('success', `Found target architect user: ${TARGET_ARCHITECT_USER_ID}`);
      addLog('info', `All architect data will be owned by user ${TARGET_ARCHITECT_USER_ID}`);
      return TARGET_ARCHITECT_USER_ID;
    }

    // If target user not found, find any architect user
    addLog('info', `Target architect user ${TARGET_ARCHITECT_USER_ID} not found or doesn't have architect role. Searching for any architect user...`);
    
    const { data: architectUsers, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'architect')
      .order('user_id', { ascending: true }); // Consistent ordering

    if (error) {
      addLog('error', `Error finding architect user: ${error.message}`);
      return null;
    }

    if (!architectUsers || architectUsers.length === 0) {
      addLog('error', 'No architect users found in database');
      addLog('error', `Expected architect user ID: ${TARGET_ARCHITECT_USER_ID}`);
      addLog('error', 'Please ensure the architect user exists and has the architect role before seeding.');
      return null;
    }

    // Use the first architect user found
    const architectUserId = architectUsers[0].user_id;
    addLog('warning', `Target architect user not found. Using first available architect user: ${architectUserId}`);
    addLog('info', `Architect data will be owned by user ${architectUserId} (seeding run by admin)`);
    
    return architectUserId;
  };

  // Helper function to clear architect seed data
  const clearArchitectSeedData = async () => {
    addLog('info', 'Clearing architect seed data...');

    // Find architect user to identify architect-owned projects
    const architectUserId = await findArchitectUserId();

    if (!architectUserId) {
      addLog('warning', 'No architect user found. Skipping project cleanup.');
      return;
    }

    // Shortcut: try RPC that deletes everything matching mock project name patterns.
    // This RPC uses SECURITY DEFINER so it can bypass RLS and remove any leftover
    // demo data reliably. If RPC is not available or fails, fall back to manual deletion.
    const demoNamePatterns = (architectMockProjects || []).map(p => ('%' + p.name + '%'));
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_architect_seed_by_project_names', {
        p_names: demoNamePatterns,
      });

      if (!rpcError) {
        addLog('success', `RPC delete_architect_seed_by_project_names executed, removed ${rpcResult?.[0] || 0} projects`);
        // Remove any registry entries related to architect seed
        await supabase.from('seed_data_registry').delete().eq('entity_type', 'architect_projects');
        addLog('info', 'Seed registry cleaned for architect_projects via RPC fallback');
        return;
      } else {
        addLog('warning', `RPC delete_architect_seed_by_project_names not available or failed: ${rpcError.message}`);
      }
    } catch (e: any) {
      addLog('warning', `RPC delete_architect_seed_by_project_names threw: ${e?.message || String(e)}`);
    }

    // Delete architect-specific projects (owned by architect users)
    addLog('info', 'Clearing architect-specific projects...');
    const { data: architectProjects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('owner_id', architectUserId);

    const projectIdsFromOwner: string[] = (architectProjects || []).map((p: any) => p.id);

    // Also include any projects that were registered in seed_data_registry as 'architect_projects'
    const { data: registryProjects } = await supabase
      .from('seed_data_registry')
      .select('entity_id')
      .eq('entity_type', 'architect_projects');

    const registryProjectIds: string[] = (registryProjects || []).map((r: any) => r.entity_id);

    // Also include projects that match the mock project names (covers cases where owner_id is NULL)
    const demoProjectNames = (architectMockProjects || []).map(p => p.name).filter(Boolean);
    let demoNameProjectIds: string[] = [];
    if (demoProjectNames.length > 0) {
      const { data: demoNameProjects } = await supabase
        .from('projects')
        .select('id')
        .in('name', demoProjectNames);
      demoNameProjectIds = (demoNameProjects || []).map((p: any) => p.id);
    }

    // Combine and deduplicate project IDs to delete
    const allProjectIds = Array.from(new Set([...projectIdsFromOwner, ...registryProjectIds, ...demoNameProjectIds]));

    if (allProjectIds.length > 0) {
      // Delete project phases and related project-level data first (avoid FK constraint failures)
      const batchSize = 100;
      for (let i = 0; i < allProjectIds.length; i += batchSize) {
        const batch = allProjectIds.slice(i, i + batchSize);
        await supabase
          .from('project_phases')
          .delete()
          .in('project_id', batch);

        // Ensure we don't violate trigger preventing deletion of the only default status
        // Unset is_default on statuses for these projects before deleting them
        await supabase
          .from('project_task_statuses')
          .update({ is_default: false })
          .in('project_id', batch);

        // Then delete the statuses
        await supabase
          .from('project_task_statuses')
          .delete()
          .in('project_id', batch);
      }

      // Then delete the projects themselves
      const { error: deleteProjectsError } = await supabase
        .from('projects')
        .delete()
        .in('id', allProjectIds);

      if (deleteProjectsError) {
        addLog('warning', `Could not delete architect projects: ${deleteProjectsError.message}`);
      } else {
        addLog('success', `Deleted ${allProjectIds.length} architect-specific projects`);
      }
    }

    // Delete in reverse dependency order (children first, then parents)
    // IMPORTANT: Delete ALL records from these tables, not just registry-tracked ones
    // This ensures a complete cleanup even if some records weren't properly registered
    const deleteOrder = [
      'architect_task_comments',
      'architect_tasks',
      'architect_moodboard_images',
      'architect_moodboard_colors',
      'architect_moodboard_sections',
      'architect_site_diary',
      'architect_meetings',
      'architect_briefings',
      'architect_opportunities',
    ];

    let totalDeleted = 0;

    for (const table of deleteOrder) {
      try {
        // First, fetch ALL IDs from the table to ensure we delete everything
        // This handles cases where records exist but aren't in the registry
        const { data: allRecords, error: fetchError } = await (supabase as any)
          .from(table)
          .select('id')
          .limit(10000); // Reasonable limit to prevent memory issues

        if (fetchError) {
          if (fetchError.message.includes('does not exist') || fetchError.message.includes('schema cache')) {
            // Table doesn't exist, skip it
            continue;
          }
          addLog('warning', `Error fetching records from ${table}: ${fetchError.message}`);
          continue;
        }

        const allIds = (allRecords || []).map((r: any) => r.id);

        if (allIds.length > 0) {
          // Delete in batches
          const batchSize = 100;
          for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const { error: deleteError } = await (supabase as any)
              .from(table)
              .delete()
              .in('id', batch);

            if (deleteError) {
              if (deleteError.message.includes('row-level security') || deleteError.message.includes('RLS')) {
                addLog('warning', `RLS policy prevents deleting from ${table}. Some records may remain.`);
              } else {
                addLog('warning', `Error deleting batch from ${table}: ${deleteError.message}`);
              }
            } else {
              totalDeleted += batch.length;
            }
          }
          addLog('info', `Deleted ${allIds.length} records from ${table}`);
        }
      } catch (err: any) {
        addLog('warning', `Error processing ${table}: ${err.message}`);
      }
    }

    // Clean up registry entries for architect tables (including architect_projects)
    const { data: registryData } = await supabase
      .from('seed_data_registry')
      .select('entity_id')
      .or('entity_type.like.architect_%,entity_type.eq.architect_projects');

    if (registryData && registryData.length > 0) {
      const registryIds = registryData.map(r => r.entity_id);
      const batchSize = 100;
      for (let i = 0; i < registryIds.length; i += batchSize) {
        const batch = registryIds.slice(i, i + batchSize);
        await supabase
          .from('seed_data_registry')
          .delete()
          .in('entity_id', batch);
      }
      addLog('info', `Cleaned up ${registryIds.length} registry entries`);
    }

    // Also delete metadata entries for architect seed data
    await supabase
      .from('seed_data_registry')
      .delete()
      .eq('entity_type', '_metadata')
      .like('metadata->>description', '%architect%');

    addLog('success', `Cleared ${totalDeleted} architect seed records`);
  };

  // Function to fetch architect table statistics
  const fetchArchitectStats = async () => {
    const architectTables = [
      { name: 'architect_projects', label: 'Projects' },
      { name: 'architect_opportunities', label: 'Opportunities' },
      { name: 'architect_briefings', label: 'Briefings' },
      { name: 'architect_meetings', label: 'Meetings' },
      { name: 'architect_tasks', label: 'Tasks' },
      { name: 'architect_task_comments', label: 'Task Comments' },
      { name: 'architect_site_diary', label: 'Site Diary' },
      { name: 'architect_moodboard_sections', label: 'Moodboard Sections' },
      { name: 'architect_moodboard_images', label: 'Moodboard Images' },
      { name: 'architect_moodboard_colors', label: 'Moodboard Colors' },
    ];

    const byTable: Record<string, { count: number; description?: string }> = {};
    let totalRecords = 0;

    // Get seed data registry for architect tables
    // Include both 'architect_%' patterns and 'architect_projects' (which is registered separately)
    const { data: registryData } = await supabase
      .from('seed_data_registry')
      .select('entity_type, entity_id')
      .or('entity_type.like.architect_%,entity_type.eq.architect_projects');

    if (!registryData) return null;

    const registry = registryData as Pick<SeedRegistryRecord, 'entity_type' | 'entity_id'>[];

    // Group by entity type
    // Handle 'architect_projects' specially - it should map to 'projects' key
    const seedRecordsByType = registry.reduce((acc, record) => {
      let entityType = record.entity_type;
      // If it's 'architect_projects', map it to 'projects' for matching
      if (entityType === 'architect_projects') {
        entityType = 'projects';
      } else {
        // Remove 'architect_' prefix for other types
        entityType = entityType.replace('architect_', '');
      }
      
      if (!acc[entityType]) {
        acc[entityType] = [];
      }
      acc[entityType].push(record.entity_id);
      return acc;
    }, {} as Record<string, string[]>);

    // Count records for each table
    for (const table of architectTables) {
      // For 'architect_projects', look for 'projects' key in the grouped data
      // For other tables, remove 'architect_' prefix
      const entityType = table.name === 'architect_projects' 
        ? 'projects' 
        : table.name.replace('architect_', '');
      
      const seedIds = seedRecordsByType[entityType] || [];
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
      .like('metadata->>description', '%architect%')
      .order('created_at', { ascending: false })
      .limit(1);

    const versionData = (versionRows?.[0] as SeedRegistryRecord | undefined) ?? null;
    const metadata = versionData?.metadata;
    const metadataRecord = metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : null;

    return {
      totalRecords,
      version: typeof metadataRecord?.version === 'string' ? metadataRecord.version : 'v1.0.0',
      timestamp: typeof metadataRecord?.timestamp === 'string'
        ? metadataRecord.timestamp
        : versionData?.created_at || new Date().toISOString(),
      byTable,
    };
  };

  // Step 0: Ensure pipeline statuses exist (required dependency)
  const seedArchitectPipelineStatuses = async (batchId: string) => {
    addLog('phase', 'Ensuring architect pipeline statuses exist...', 'Step 0');
    
    // Check if statuses already exist
    const { data: existingStatuses } = await supabase
      .from('architect_pipeline_statuses')
      .select('id, name');

    if (existingStatuses && existingStatuses.length > 0) {
      addLog('info', `Found ${existingStatuses.length} existing pipeline statuses`);
      return existingStatuses;
    }

    // Insert default statuses if none exist
    addLog('info', 'No pipeline statuses found. Creating default statuses...');
    const defaultStatuses = [
      { name: 'initial_contact', color: '#3B82F6', position: 0, is_default: true, is_terminal: false },
      { name: 'briefing', color: '#8B5CF6', position: 1, is_default: true, is_terminal: false },
      { name: 'proposal_sent', color: '#F59E0B', position: 2, is_default: true, is_terminal: false },
      { name: 'negotiation', color: '#10B981', position: 3, is_default: true, is_terminal: false },
      { name: 'won', color: '#22C55E', position: 4, is_default: true, is_terminal: true },
      { name: 'lost', color: '#EF4444', position: 5, is_default: true, is_terminal: true },
    ];

    const { data: insertedStatuses, error } = await supabase
      .from('architect_pipeline_statuses')
      .insert(defaultStatuses)
      .select();

    if (error) {
      addLog('error', `Failed to seed pipeline statuses: ${error.message}`);
      throw new Error(`Failed to seed pipeline statuses: ${error.message}`);
    }

    // Register seeded statuses (though they're not typically cleared)
    for (const status of insertedStatuses || []) {
      await registerSeedRecord('architect_pipeline_statuses', status.id, batchId);
    }

    addLog('success', `Seeded ${insertedStatuses?.length || 0} pipeline statuses`);
    return insertedStatuses || [];
  };

  // Step 1: Seed architect opportunities (based on mock data)
  // CRITICAL: Associate opportunities with projects when possible
  const seedArchitectOpportunities = async (clients: any[], projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect opportunities...', 'Step 1');

    // Get pipeline statuses (should exist after Step 0)
    const { data: stageRows } = await supabase
      .from('architect_pipeline_statuses')
      .select('id, name');

    if (!stageRows || stageRows.length === 0) {
      throw new Error('No pipeline statuses found. Please ensure architect_pipeline_statuses table has data.');
    }

    const stageMap = new Map<string, string>();
    (stageRows || []).forEach((row: any) => {
      stageMap.set(row.name.toLowerCase(), row.id);
    });

    // Map mock opportunities to database format
    // Distribute opportunities across all projects/clients
    const opportunities = architectMockOpportunities.map((mockOpp, index) => {
      // Find matching client by name or distribute across clients
      let client = clients.find(c => 
        c.name === mockOpp.clients?.name || 
        c.email?.includes(mockOpp.clients?.email || '')
      );
      
      // If no match found, distribute across available clients
      if (!client) {
        client = clients[index % clients.length];
      }

      if (!client) {
        throw new Error('No clients available for seeding opportunities');
      }

      // Map stage to stage_id - ensure we always have a valid stage_id
      const stageName = mockOpp.stage || 'lead';
      let stageId = stageMap.get(stageName);
      
      // If stage not found, try to find a default stage or use the first available
      if (!stageId) {
        // Try to find 'initial_contact' or 'lead' as fallback
        stageId = stageMap.get('initial_contact') || stageMap.get('lead') || stageRows[0]?.id;
      }

      if (!stageId) {
        throw new Error(`Could not find a valid stage_id for stage "${stageName}". Available stages: ${stageRows.map(s => s.name).join(', ')}`);
      }

      return {
        client_id: client.id,
        project_name: mockOpp.project_name,
        estimated_value: mockOpp.estimated_value,
        probability: mockOpp.probability,
        stage: stageName,
        stage_id: stageId, // This is now guaranteed to be non-null
        expected_closing_date: mockOpp.expected_closing_date ? mockOpp.expected_closing_date.split('T')[0] : null,
        notes: mockOpp.notes || null,
        created_by: userId || null,
      };
    });

    try {
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('insert_architect_opportunities_for_seeding', {
        p_opportunities: opportunities
      });

      if (error) {
        throw new Error(`Failed to seed architect opportunities: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Insert returned no data - check RPC function');
      }
      
      for (const opportunity of data || []) {
        await registerSeedRecord('opportunities', opportunity.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect opportunities`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect opportunities: ${error.message}`);
      throw error;
    }
  };

  // Step 2: Seed architect briefings (based on mock data)
  // CRITICAL: Each project must have at least one briefing
  const seedArchitectBriefings = async (projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect briefings...', 'Step 2');

    // Map mock briefings to database format
    // Distribute briefings across all projects
    const briefings = architectMockBriefings.map((mockBriefing, index) => {
      // Use mapping helper to find correct project, or distribute across projects
      const projectId = mapMockProjectToDbProject('project-01', projects) || 
                       mapMockProjectToDbProject('project-02', projects) ||
                       mapMockProjectToDbProject('project-03', projects);
      
      let project = projectId ? projects.find(p => p.id === projectId) : null;
      
      // If no match found, distribute across available projects
      if (!project) {
        project = projects[index % projects.length];
      }

      if (!project) {
        throw new Error('No projects available for seeding briefings');
      }

      return {
        project_id: project.id,
        client_objectives: mockBriefing.client_objectives || null,
        style_preferences: mockBriefing.style_preferences || null,
        budget_range_min: mockBriefing.budget_range_min || null,
        budget_range_max: mockBriefing.budget_range_max || null,
        area_m2: mockBriefing.area_m2 || null,
        must_haves: mockBriefing.must_haves || null,
        constraints: mockBriefing.constraints || null,
        inspirations: mockBriefing.inspirations || [],
        notes: mockBriefing.notes || null,
        created_by: userId || null,
      };
    });

    try {
      // Use RPC function with SECURITY DEFINER to bypass RLS
      addLog('info', `Inserting ${briefings.length} briefings via RPC (bypasses RLS)...`);
      
      const { data: createdBriefings, error: createError } = await supabase.rpc('insert_architect_briefings_for_seeding', {
        p_briefings: briefings as any,
      });

      if (createError) {
        addLog('error', `Failed to create architect briefings via RPC: ${createError.message}`);
        addLog('error', `Error details: ${JSON.stringify(createError)}`);
        throw new Error(`Failed to seed architect briefings: ${createError.message}`);
      }

      if (!createdBriefings || createdBriefings.length === 0) {
        addLog('warning', 'RPC returned no data - briefings may have been created but not returned');
        // Still try to register what we attempted to insert
        for (let i = 0; i < briefings.length; i++) {
          await registerSeedRecord('briefings', `briefing-${batchId}-${i}`, batchId);
        }
      } else {
        for (const briefing of createdBriefings) {
          await registerSeedRecord('briefings', briefing.id, batchId);
        }
      }

      addLog('success', `Seeded ${createdBriefings?.length || briefings.length} architect briefings`);
      return createdBriefings || briefings;
    } catch (error: any) {
      addLog('error', `Failed to seed architect briefings: ${error.message}`);
      throw error;
    }
  };

  // Step 3: Seed architect meetings (based on mock data)
  // CRITICAL: Each project must have meetings with its dedicated client
  const seedArchitectMeetings = async (projects: any[], clients: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect meetings...', 'Step 3');

    // Create project-to-client mapping (1:1 relationship)
    const projectClientMap = new Map<string, string>();
    for (const project of projects) {
      // Find the client associated with this project
      const client = clients.find(c => c.id === project.client_id);
      if (client) {
        projectClientMap.set(project.id, client.id);
      }
    }

    // Map mock meetings to database format
    // Distribute meetings across all projects
    const meetings = architectMockMeetings.map((mockMeeting, index) => {
      // Use mapping helper to find correct project
      let project = null;
      if (mockMeeting.projects?.id) {
        const projectId = mapMockProjectToDbProject(mockMeeting.projects.id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // If no match found, distribute across available projects
      if (!project) {
        project = projects[index % projects.length];
      }

      // Get the client associated with this project (1:1 relationship)
      const clientId = projectClientMap.get(project.id);
      const client = clientId ? clients.find(c => c.id === clientId) : clients[index % clients.length];

      return {
        project_id: project?.id || null,
        client_id: client?.id || null,
        title: mockMeeting.title || null,
        meeting_date: mockMeeting.meeting_date || new Date().toISOString(),
        participants: mockMeeting.participants || [],
        agenda: null,
        decisions: null,
        next_actions: null,
        created_by: userId || null,
      };
    });

    // Filter out meetings with null project_id before inserting
    // RLS policy requires project_id to be NOT NULL for has_project_access check
    // or created_by to be set (which it is, but the policy also requires project access)
    const validMeetings = meetings.filter(m => m.project_id !== null);
    
    if (validMeetings.length === 0) {
      addLog('warning', 'No valid meetings to seed - all meetings had null project_id');
      return [];
    }
    
    if (validMeetings.length < meetings.length) {
      addLog('warning', `Filtered out ${meetings.length - validMeetings.length} meetings with null project_id`);
    }

    try {
      const data = await insertWithRLSHandling('architect_meetings', validMeetings, addLog);
      
      for (const meeting of data || []) {
        await registerSeedRecord('meetings', meeting.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect meetings`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect meetings: ${error.message}`);
      throw error;
    }
  };

  // Step 4: Seed architect tasks (based on mock data)
  // CRITICAL: Each project must have tasks distributed based on mock data
  const seedArchitectTasks = async (projects: any[], phases: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect tasks...', 'Step 4');

    // Get project task statuses for all projects
    const hasStatusId = await hasColumn('architect_tasks', 'status_id');
    const statusMap = new Map<string, string>();
    
    if (hasStatusId) {
      // Get statuses for all projects
      for (const project of projects) {
        const { data: statuses } = await supabase
          .from('project_task_statuses')
          .select('id, slug')
          .eq('project_id', project.id);
        
        (statuses || []).forEach((status: any) => {
          // Use project-specific key to avoid conflicts
          statusMap.set(`${project.id}:${status.slug}`, status.id);
        });
      }
    }

    // Map mock tasks to database format
    // Distribute tasks across all projects based on mock data
    const tasks = architectMockTasks.map((mockTask) => {
      // Use mapping helper to find correct project based on mock project_id
      let project = null;
      if (mockTask.project_id) {
        const projectId = mapMockProjectToDbProject(mockTask.project_id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // Fallback: try to match by name
      if (!project && mockTask.projects?.name) {
        project = projects.find(p => 
          p.name === mockTask.projects?.name ||
          p.name?.includes(mockTask.projects?.name || '')
        );
      }
      
      // If still no match, distribute across available projects
      if (!project) {
        project = projects[0];
      }

      if (!project) {
        throw new Error('No projects available for seeding tasks');
      }

      // Find a phase for this project
      const projectPhases = phases.filter(p => p.project_id === project.id);
      const phase = projectPhases.length > 0 ? projectPhases[0] : null;

      // Map status - use project-specific status lookup
      const statusSlug = mockTask.status === 'todo' ? 'todo' :
                        mockTask.status === 'in_progress' ? 'in_progress' :
                        mockTask.status === 'completed' ? 'completed' : 'todo';
      const statusId = hasStatusId ? (statusMap.get(`${project.id}:${statusSlug}`) || null) : null;

      return {
        project_id: project.id,
        phase_id: phase?.id || null,
        title: mockTask.title,
        description: mockTask.description || null,
        assignee_id: userId || null,
        team_member_id: null,
        due_date: mockTask.due_date ? mockTask.due_date.split('T')[0] : null,
        priority: mockTask.priority || 'medium',
        status: mockTask.status || 'todo',
        status_id: statusId,
        tags: mockTask.tags || [],
        created_by: userId || null,
      };
    });

    try {
      const data = await insertWithRLSHandling('architect_tasks', tasks, addLog);
      
      for (const task of data || []) {
        await registerSeedRecord('tasks', task.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect tasks`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect tasks: ${error.message}`);
      throw error;
    }
  };

  // Step 5: Seed architect task comments (based on mock data)
  const seedArchitectTaskComments = async (tasks: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect task comments...', 'Step 5');
    
    if (!userId) {
      addLog('info', 'Skipping architect task comments (no user ID available)');
      return [];
    }

    if (!tasks || tasks.length === 0) {
      addLog('warning', 'No tasks available for seeding comments');
      return [];
    }

    // Create comments for tasks - ensure we create comments for all tasks with appropriate statuses
    const comments: any[] = [];

    // Comment templates for different task statuses
    const commentTemplates = {
      in_progress: [
        'Started working on this task. Reviewing requirements and gathering materials.',
        'Making good progress. Will have an update by end of week.',
        'Encountered a minor issue, but working through it. Should be resolved soon.',
      ],
      completed: [
        'Task completed successfully. All deliverables are ready for review.',
        'Finished this task. Please review and let me know if any changes are needed.',
        'Completed ahead of schedule. Documentation attached.',
      ],
      todo: [
        'Planning to start this task next week. Gathering initial requirements.',
        'Added to my queue. Will begin work shortly.',
      ],
    };

    // Create comments for all tasks, prioritizing in_progress and completed
    for (const task of tasks) {
      const status = task.status || 'todo';
      const templates = commentTemplates[status as keyof typeof commentTemplates] || commentTemplates.todo;
      
      // Create 1-3 comments per task based on status
      let numComments = 1;
      if (status === 'in_progress' || status === 'completed') {
        numComments = 2 + Math.floor(Math.random() * 2); // 2-3 comments
      } else {
        numComments = 1; // 1 comment for todo tasks
      }

      for (let i = 0; i < numComments && i < templates.length; i++) {
        const commentDate = new Date();
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          // Set comment dates before due date
          commentDate.setTime(dueDate.getTime() - (numComments - i) * 2 * 24 * 60 * 60 * 1000);
        } else {
          // If no due date, use created_at or current date minus days
          commentDate.setDate(commentDate.getDate() - (numComments - i) * 2);
        }

        comments.push({
          task_id: task.id,
          user_id: userId,
          comment: templates[i] || `Update on ${task.title || 'task'}`,
          created_at: commentDate.toISOString(),
        });
      }
    }

    if (comments.length === 0) {
      addLog('warning', 'No task comments generated - this should not happen');
      return [];
    }

    addLog('info', `Generated ${comments.length} task comments for ${tasks.length} tasks`);

    try {
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('insert_architect_task_comments_for_seeding', {
        p_comments: comments
      });

      if (error) {
        throw new Error(`Failed to seed architect task comments: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Insert returned no data - check RPC function');
      }
      
      for (const comment of data || []) {
        await registerSeedRecord('task_comments', comment.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect task comments`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect task comments: ${error.message}`);
      throw error;
    }
  };

  // Step 6: Seed architect site diary (based on mock data)
  // CRITICAL: Each project must have site diary entries
  const seedArchitectSiteDiary = async (projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect site diary entries...', 'Step 6');

    // Map mock diary entries to database format
    // Distribute diary entries across all projects
    const diaryEntries = architectMockDiaryEntries.map((mockDiary, index) => {
      // Use mapping helper to find correct project
      let project = null;
      if (mockDiary.project_id) {
        const projectId = mapMockProjectToDbProject(mockDiary.project_id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // If no match found, distribute across available projects
      if (!project) {
        project = projects[index % projects.length];
      }

      if (!project) {
        throw new Error('No projects available for seeding site diary');
      }

      return {
        project_id: project.id,
        diary_date: mockDiary.diary_date ? mockDiary.diary_date.split('T')[0] : new Date().toISOString().split('T')[0],
        weather: mockDiary.weather || null,
        progress_summary: mockDiary.progress_summary || null,
        notes: mockDiary.notes || null,
        photos: mockDiary.photos || [],
        checklist_status: {},
        created_by: userId || null,
      };
    });

    try {
      const data = await insertWithRLSHandling('architect_site_diary', diaryEntries, addLog);
      
      for (const entry of data || []) {
        await registerSeedRecord('site_diary', entry.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect site diary entries`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect site diary: ${error.message}`);
      throw error;
    }
  };

  // Step 7: Seed architect moodboard sections (based on mock data)
  // CRITICAL: Each project must have moodboard sections
  const seedArchitectMoodboardSections = async (projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect moodboard sections...', 'Step 7');

    // Map mock sections to database format
    // Distribute sections across all projects
    const sections = architectMockMoodboardSections.map((mockSection, index) => {
      // Use mapping helper to find correct project
      let project = null;
      if (mockSection.project_id) {
        const projectId = mapMockProjectToDbProject(mockSection.project_id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // If no match found, distribute across available projects
      if (!project) {
        project = projects[index % projects.length];
      }

      if (!project) {
        throw new Error('No projects available for seeding moodboard sections');
      }

      return {
        project_id: project.id,
        name: mockSection.name,
        description: mockSection.description || null,
        sort_order: mockSection.sort_order || 0,
        created_by: userId || null,
      };
    });

    try {
      const data = await insertWithRLSHandling('architect_moodboard_sections', sections, addLog);
      
      for (const section of data || []) {
        await registerSeedRecord('moodboard_sections', section.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect moodboard sections`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect moodboard sections: ${error.message}`);
      throw error;
    }
  };

  // Helper function to download and upload image to Supabase storage
  const downloadAndUploadImage = async (
    imageUrl: string,
    projectId: string,
    description: string,
    addLog: LogHandler
  ): Promise<string | null> => {
    try {
      addLog('info', `Downloading image: ${description.substring(0, 50)}...`);
      
      // Download image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Convert Blob to File for image compression
      const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `image.${fileExt}`;
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      
      // Compress image before upload
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      addLog('info', 'Compressing image...');
      const compressedFile = await imageCompression(file, compressionOptions);

      // Generate unique filename (reuse fileExt from above)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const storagePath = `${projectId}/${timestamp}-${randomStr}.${fileExt}`;

      // Upload to Supabase Storage
      addLog('info', `Uploading to storage: ${storagePath}...`);
      const { error: uploadError } = await supabase.storage
        .from('architect-moodboards')
        .upload(storagePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
      }

      addLog('success', `Successfully uploaded: ${description.substring(0, 30)}...`);
      return storagePath;
    } catch (error: any) {
      addLog('warning', `Failed to download/upload image ${description}: ${error.message}`);
      return null;
    }
  };

  // Step 8: Seed architect moodboard images (based on mock data)
  const seedArchitectMoodboardImages = async (sections: any[], projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect moodboard images...', 'Step 8');

    // Create a map of section names to section IDs
    const sectionMap = new Map<string, string>();
    for (const section of sections) {
      // Try to match by name from mock data
      const mockSection = architectMockMoodboardSections.find(ms => 
        ms.name === section.name
      );
      if (mockSection) {
        sectionMap.set(mockSection.id, section.id);
      }
    }

    // Process each mock image: download, upload to storage, then create database record
    const imageRecords: any[] = [];

    for (const mockImage of architectMockMoodboardImages) {
      // Find matching section
      const sectionId = sectionMap.get(mockImage.section_id) || sections[0]?.id;

      // Use mapping helper to find correct project
      let project = null;
      if (mockImage.project_id) {
        const projectId = mapMockProjectToDbProject(mockImage.project_id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // If no match found, use first project
      if (!project) {
        project = projects[0];
      }

      if (!sectionId || !project) {
        addLog('warning', `Skipping image ${mockImage.id}: missing section or project`);
        continue;
      }

      // Download and upload image to storage
      const storagePath = await downloadAndUploadImage(
        mockImage.image_url,
        project.id,
        mockImage.description || 'Moodboard image',
        addLog
      );

      if (!storagePath) {
        addLog('warning', `Skipping image ${mockImage.id}: failed to upload to storage`);
        continue;
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('architect-moodboards')
        .getPublicUrl(storagePath);

      imageRecords.push({
        section_id: sectionId,
        project_id: project.id,
        image_url: publicUrl,
        storage_path: storagePath,
        description: mockImage.description || null,
        sort_order: mockImage.sort_order || 0,
        created_by: userId || null,
      });
    }

    if (imageRecords.length === 0) {
      addLog('warning', 'No moodboard images were successfully processed');
      return [];
    }

    addLog('info', `Inserting ${imageRecords.length} moodboard image records into database...`);

    try {
      const data = await insertWithRLSHandling('architect_moodboard_images', imageRecords, addLog);
      
      for (const image of data || []) {
        await registerSeedRecord('moodboard_images', image.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect moodboard images`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect moodboard images: ${error.message}`);
      throw error;
    }
  };

  // Step 9: Seed architect moodboard colors (based on mock data)
  // CRITICAL: Each project must have moodboard colors
  const seedArchitectMoodboardColors = async (projects: any[], batchId: string, userId: string) => {
    addLog('phase', 'Seeding architect moodboard colors...', 'Step 9');

    // Map mock colors to database format
    // Distribute colors across all projects
    const colors = architectMockMoodboardColors.map((mockColor, index) => {
      // Use mapping helper to find correct project
      let project = null;
      if (mockColor.project_id) {
        const projectId = mapMockProjectToDbProject(mockColor.project_id, projects);
        project = projectId ? projects.find(p => p.id === projectId) : null;
      }
      
      // If no match found, distribute across available projects
      if (!project) {
        project = projects[index % projects.length];
      }

      if (!project) {
        throw new Error('No projects available for seeding moodboard colors');
      }

      return {
        project_id: project.id,
        color_code: mockColor.color_code,
        color_name: mockColor.color_name || null,
        sort_order: mockColor.sort_order || 0,
        created_by: userId || null,
      };
    });

    try {
      const data = await insertWithRLSHandling('architect_moodboard_colors', colors, addLog);
      
      for (const color of data || []) {
        await registerSeedRecord('moodboard_colors', color.id, batchId);
      }

      addLog('success', `Seeded ${data?.length || 0} architect moodboard colors`);
      return data || [];
    } catch (error: any) {
      addLog('error', `Failed to seed architect moodboard colors: ${error.message}`);
      throw error;
    }
  };

  // Main seeding function
  const executeArchitectSeeding = async () => {
    // Allow skipping auth checks in local/script runs by setting SKIP_AUTH_FOR_SEED=1
    let currentUserId: string | null = null;
    const skipAuthForSeed = (typeof process !== 'undefined' && process.env && process.env.SKIP_AUTH_FOR_SEED === '1');
    if (!skipAuthForSeed) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
      if (!currentUserId) throw new Error('User ID not found');
    } else {
      addLog('warning', 'SKIP_AUTH_FOR_SEED=1 detected — skipping auth/session checks for local seeding run');
    }

    // CRITICAL: Find a user with architect role to use for seeding
    // IMPORTANT: Seeding is done by admin, but data must be owned by architect user
    // Do NOT use the current user (admin) - always find the architect user
    addLog('info', 'Finding architect user for data ownership (seeding run by admin)...');
    const architectUserId = await findArchitectUserId();

    // If no architect user exists, we cannot proceed
    // Do NOT grant architect role to admin - architect role must exist separately
    if (!architectUserId) {
      addLog('error', 'No architect user found in database. Cannot seed architect data.');
      addLog('error', 'Please ensure at least one user has the architect role before seeding.');
      throw new Error('No architect user found. Cannot proceed with architect data seeding.');
    }

    addLog('success', `Using architect user (${architectUserId}) for data ownership`);
    addLog('info', `All architect data will be owned by user ${architectUserId}, regardless of who runs the seeding`);

    // Use architectUserId for all seeding operations
    const userId = architectUserId;

    // Clear existing architect seed data first
    await clearArchitectSeedData();

    // Generate batch ID for this seeding session
    const batchId = crypto.randomUUID();

    const stats: any = {
      total: 0,
      version: 'v1.0.0',
      timestamp: new Date().toISOString(),
      architect_projects: 0, // Initialize projects count
      architect_clients: 0, // Initialize clients count
    };

    try {
      // Verify the architect user still has the role (for safety)
      const { data: architectUserRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasArchitectRole = architectUserRoles?.some((r: any) => r.role === 'architect') || false;
      const hasAdminRole = architectUserRoles?.some((r: any) => r.role === 'admin') || false;

      if (!hasArchitectRole) {
        addLog('error', `Selected user (${userId}) does not have architect role!`);
        throw new Error('Selected user must have architect role to seed architect data');
      }

      addLog('info', `Seeding architect data using architect user: ${userId}`);

      // Get existing clients (they should be seeded by main process)
      // If none exist, create architect-specific clients from mock data
      const { data: fetchedClients } = await supabase
        .from('clients')
        .select('id, name, email')
        .limit(10);

      let existingClients = fetchedClients || [];

      if (!existingClients || existingClients.length === 0) {
        addLog('info', 'No existing clients found. Creating architect-specific clients from mock data...');
        
        // Create clients from architectMockClients
        const clientsToCreate = architectMockClients.map(mockClient => ({
          name: mockClient.name,
          email: mockClient.email,
          phone: mockClient.phone,
          location: mockClient.location,
          company_name: mockClient.company_name,
          status: mockClient.status || 'active',
          client_type: mockClient.type === 'corporate' ? 'corporate' : 'residential',
          sales_status: mockClient.status === 'active' ? 'active' : mockClient.status === 'lead' ? 'lead' : 'prospect',
        }));

        // Use RPC function to bypass RLS (SECURITY DEFINER)
        const { data: createdClients, error: createError } = await supabase.rpc('insert_clients_for_seeding', {
          p_clients: clientsToCreate as any,
        });

        if (createError) {
          addLog('error', `Failed to create clients: ${createError.message}`);
          throw new Error(`Failed to create clients: ${createError.message}`);
        }

        existingClients = createdClients || [];
        addLog('success', `Created ${existingClients.length} architect-specific clients`);
      } else {
        addLog('info', `Found ${existingClients.length} existing clients`);
      }
      
      // Track clients that will be used by architect projects
      // We'll register them after projects are created to ensure we only track clients actually used
      const architectClientsSet = new Set<string>();

      // Create architect-specific projects owned by the architect user
      // These projects will be isolated from regular project managers
      // CRITICAL: Always create NEW projects from mock data, don't reuse existing ones
      // The clearArchitectSeedData function should have deleted old projects, but we create fresh ones anyway
      addLog('info', `Creating NEW architect-specific projects from mock data for architect user ${userId}...`);
      
      // Always create new projects from mock data (don't reuse existing ones)
      // This ensures we always have the correct projects with the correct names from mock data
      // CRITICAL: Each project must have its dedicated client (1:1 relationship based on mock data)
      const mockProjects = architectMockProjects.slice(0, Math.min(3, existingClients.length));
      const architectProjects: any[] = [];
      
      // Create a mapping from mock client IDs to actual database clients
      const clientMap = new Map<string, any>();
      for (const mockClient of architectMockClients) {
        const dbClient = existingClients.find(c => 
          c.name?.includes(mockClient.name.split(' ')[0]) || // Match "Aurora", "Greenfield", "Isabella"
          c.email?.includes(mockClient.email?.split('@')[0] || '')
        );
        if (dbClient) {
          clientMap.set(mockClient.id, dbClient);
        }
      }
      
      // Fallback: if mapping fails, assign sequentially
      if (clientMap.size === 0) {
        for (let i = 0; i < architectMockClients.length && i < existingClients.length; i++) {
          clientMap.set(architectMockClients[i].id, existingClients[i]);
        }
      }
      
      for (let i = 0; i < mockProjects.length; i++) {
        const mockProject = mockProjects[i];
        // Map mock project's client_id to actual database client (1:1 relationship)
        const client = clientMap.get(mockProject.client_id) || existingClients[i % existingClients.length];
        
        // CRITICAL: Check if a project with this name already exists for this architect user
        // This prevents duplicate projects if seeding is run multiple times
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id, name, client_id, start_date, owner_id')
          .eq('name', mockProject.name)
          .eq('owner_id', userId)
          .limit(1)
          .single();
        
        if (existingProject) {
          addLog('info', `Project "${mockProject.name}" already exists (ID: ${existingProject.id}), skipping creation`);
          architectProjects.push(existingProject);
          // Track this client as being used by architect projects
          architectClientsSet.add(existingProject.client_id || client.id);
          
          // CRITICAL: Add current user as team member to grant RLS access for seeding
          if (currentUserId && currentUserId !== userId) {
            const teamResult = await addTeamMemberWithVerification(existingProject.id, currentUserId, 3, 500);
            
            if (!teamResult.success) {
              addLog('error', `CRITICAL: Failed to add team member to existing project ${existingProject.id}: ${teamResult.error}`);
              addLog('error', `This will cause RLS errors when seeding briefings and other project data`);
            } else if (!teamResult.verified) {
              addLog('warning', `Team member added but verification failed for project ${existingProject.id}: ${teamResult.error}`);
              addLog('warning', `RLS errors may still occur when seeding`);
            } else {
              addLog('success', `Verified team member added to existing project ${existingProject.name} for RLS access`);
            }
          }
          continue;
        }
        
        // Track this client as being used by architect projects
        architectClientsSet.add(client.id);
        
        const projectData: any = {
          name: mockProject.name,
          client_id: client.id,
          status: mockProject.status as any,
          start_date: mockProject.start_date ? new Date(mockProject.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          budget_total: mockProject.budget_total || 0,
          location: mockProject.location || '',
          description: mockProject.description || '',
          owner_id: userId, // CRITICAL: Set owner_id to architect user
          manager_id: userId, // CRITICAL: Assign architect as project manager
        };

        addLog('info', `Attempting to create architect project: ${mockProject.name} with owner_id: ${userId}`);
        addLog('info', `Project data: ${JSON.stringify({ ...projectData, client_id: client.id })}`);
        
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id, name, client_id, start_date, owner_id, manager_id')
          .single();

        if (projectError) {
          addLog('error', `Failed to create architect project ${mockProject.name}: ${projectError.message}`);
          addLog('error', `Error details: ${JSON.stringify(projectError)}`);
          throw new Error(`Failed to create architect project: ${projectError.message}`);
        }

        if (!newProject) {
          addLog('error', `Project insert returned no data for ${mockProject.name}`);
          throw new Error(`Failed to create architect project ${mockProject.name}: No data returned`);
        }

        // Ensure the inserted row contains an `id` before attempting verification.
        if (!newProject.id) {
          addLog('error', `Project insert returned no id for ${mockProject.name}: ${JSON.stringify(newProject)}`);
          throw new Error(`Failed to create architect project ${mockProject.name}: Insert did not return an id`);
        }

        // Prefer trusting the insert response when possible. In some environments
        // RLS policies can prevent subsequent SELECTs from returning the row,
        // causing verification to fail even though the INSERT succeeded.
        const insertOwnerId = newProject.owner_id;
        const insertManagerId = newProject.manager_id;

        if (insertOwnerId === userId) {
          architectProjects.push(newProject);

          if (insertManagerId === userId) {
            addLog('success', `Created architect-owned project: ${newProject.name} (owner_id: ${insertOwnerId}, manager_id: ${insertManagerId})`);
          } else {
            addLog('warning', `Project ${newProject.name} created but manager_id not set to architect. Expected: ${userId}, Got: ${insertManagerId || 'null'}. Trigger should set this automatically.`);
          }

          // Register in seed registry as 'architect_projects' so it shows in the summary
          const registerError = await registerSeedRecord('architect_projects', newProject.id, batchId);
          if (registerError) {
            addLog('warning', `Failed to register project ${newProject.name} in seed registry: ${registerError}`);
          } else {
            addLog('success', `Registered project ${newProject.name} in seed registry`);
          }

          // CRITICAL: Add current user as team member to grant RLS access for seeding
          // The admin user running the seeding needs project access to insert briefings
          if (currentUserId && currentUserId !== userId) {
            const teamResult = await addTeamMemberWithVerification(newProject.id, currentUserId, 3, 500);
            
            if (!teamResult.success) {
              addLog('error', `CRITICAL: Failed to add team member to project ${newProject.id}: ${teamResult.error}`);
              addLog('error', `This will cause RLS errors when seeding briefings and other project data`);
            } else if (!teamResult.verified) {
              addLog('warning', `Team member added but verification failed for project ${newProject.id}: ${teamResult.error}`);
              addLog('warning', `RLS errors may still occur when seeding`);
            } else {
              addLog('success', `Verified team member added to project ${newProject.name} for RLS access`);
            }
          }
        } else {
          // Fallback: attempt to SELECT the row to verify owner/manager. This may be
          // blocked by RLS in some setups; handle that gracefully and provide a
          // clear error message to guide remediation (use service-role or RPCs).
          const { data: verifyProject, error: verifyError } = await supabase
            .from('projects')
            .select('id, name, owner_id, manager_id')
            .eq('id', newProject.id)
            .maybeSingle();

          if (verifyError) {
            addLog('error', `Failed to verify project ${newProject.name}: ${verifyError.message}`);
            addLog('error', `Project insert response: ${JSON.stringify(newProject)}`);
            // Likely an RLS policy is blocking SELECT. Provide actionable guidance.
            throw new Error(`Failed to verify architect project due to permission/RLS: ${verifyError.message}`);
          }

          if (verifyProject && verifyProject.owner_id === userId) {
            architectProjects.push(newProject);
            addLog('success', `Created architect-owned project (verified via SELECT): ${newProject.name}`);
            const registerError = await registerSeedRecord('architect_projects', newProject.id, batchId);
            if (registerError) addLog('warning', `Failed to register project ${newProject.name} in seed registry: ${registerError}`);
          } else {
            addLog('warning', `Project ${newProject.name} created but owner_id verification failed. Attempting to correct via RPC... Expected: ${userId}, Got: ${verifyProject?.owner_id || 'null'}`);
            addLog('info', `Attempting RPC set_project_owner_for_seeding for project ${newProject.id}`);

            try {
              const { data: rpcResult, error: rpcError } = await supabase.rpc('set_project_owner_for_seeding', {
                p_project_id: newProject.id,
                p_owner_id: userId,
                p_manager_id: userId,
              });

              if (rpcError) {
                addLog('error', `RPC set_project_owner_for_seeding failed: ${rpcError.message}`);
              } else {
                addLog('success', `RPC set_project_owner_for_seeding executed: ${rpcResult}`);
              }
            } catch (rpcErr: any) {
              addLog('error', `RPC call threw: ${rpcErr?.message || String(rpcErr)}`);
            }

            // Re-fetch the project to re-verify ownership
            const { data: reloadedProject, error: reloadError } = await supabase
              .from('projects')
              .select('id, name, owner_id, manager_id')
              .eq('id', newProject.id)
              .maybeSingle();

            if (reloadError) {
              addLog('error', `Failed to re-verify project ${newProject.name}: ${reloadError.message}`);
              throw new Error(`Failed to verify architect project after RPC: ${reloadError.message}`);
            }

            if (reloadedProject && reloadedProject.owner_id === userId) {
              architectProjects.push(newProject);
              addLog('success', `Adjusted project ownership via RPC: ${newProject.name} (owner_id: ${reloadedProject.owner_id}, manager_id: ${reloadedProject.manager_id})`);
              const registerError = await registerSeedRecord('architect_projects', newProject.id, batchId);
              if (registerError) {
                addLog('warning', `Failed to register project ${newProject.name} in seed registry: ${registerError}`);
              } else {
                addLog('success', `Registered project ${newProject.name} in seed registry`);
              }
            } else {
              addLog('error', `Project ${newProject.name} was created but owner_id verification failed and RPC could not correct it. Expected: ${userId}, Got: ${reloadedProject?.owner_id || 'null'}`);
              addLog('error', `Verify project data: ${JSON.stringify(reloadedProject || newProject)}`);
              throw new Error(`Architect project owner_id verification failed for ${newProject.name}`);
            }
          }
        }
      }

      if (architectProjects.length === 0) {
        throw new Error('Failed to create any architect-specific projects');
      }

      // Register clients used by architect projects in seed registry
      // Only register clients that are actually used by architect projects
      const architectClientsArray = Array.from(architectClientsSet);
      for (const clientId of architectClientsArray) {
        // Check if already registered (might have been registered when created)
        const { data: existingRegistry } = await supabase
          .from('seed_data_registry')
          .select('id')
          .eq('entity_type', 'architect_clients')
          .eq('entity_id', clientId)
          .limit(1);
        
        if (!existingRegistry || existingRegistry.length === 0) {
          await registerSeedRecord('architect_clients', clientId, batchId);
        }
      }
      
      // Add projects and clients count to stats
      stats.architect_projects = architectProjects.length;
      stats.architect_clients = architectClientsArray.length;
      addLog('success', `Created ${architectProjects.length} architect-owned projects`);
      addLog('success', `Associated ${architectClientsArray.length} clients with architect projects`);

      // Get phases for architect projects
      let existingPhases: any[] = [];
      const { data: phasesData } = await supabase
        .from('project_phases')
        .select('id, project_id, phase_name')
        .in('project_id', architectProjects.map(p => p.id))
        .limit(50);

      if (phasesData) {
        existingPhases = phasesData;
      }

      // Create default phases for architect projects if they don't exist
      if (!existingPhases || existingPhases.length === 0) {
        addLog('info', 'Creating default phases for architect projects...');
        const defaultPhaseNames = ['Conceito', 'Desenvolvimento', 'Documentação', 'Execução'];
        
        for (const project of architectProjects) {
          for (let i = 0; i < defaultPhaseNames.length; i++) {
            const phaseName = defaultPhaseNames[i];
            const startDate = new Date(project.start_date || new Date());
            startDate.setMonth(startDate.getMonth() + i * 2);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 2);

            const { data: phase, error: phaseError } = await supabase
              .from('project_phases')
              .insert({
                project_id: project.id,
                phase_name: phaseName,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                status: i === 0 ? 'in_progress' : 'pending',
                progress_percentage: i === 0 ? 25 : 0,
              })
              .select('id, project_id, phase_name')
              .single();

            if (!phaseError && phase) {
              existingPhases.push(phase);
              await registerSeedRecord('project_phases', phase.id, batchId);
            }
          }
        }

        addLog('success', `Created ${existingPhases.length} phases for architect projects`);
      }

      // Final verification: Ensure all architect projects have correct owner_id
      const { data: verifyArchitectProjects } = await supabase
        .from('projects')
        .select('id, name, owner_id')
        .in('id', architectProjects.map(p => p.id));
      
      const invalidProjects = verifyArchitectProjects?.filter(p => p.owner_id !== userId) || [];
      if (invalidProjects.length > 0) {
        addLog('error', `WARNING: ${invalidProjects.length} architect projects have incorrect owner_id!`);
        invalidProjects.forEach(p => {
          addLog('error', `  - ${p.name}: owner_id = ${p.owner_id} (expected ${userId})`);
        });
        throw new Error('Architect project ownership verification failed');
      }
      
      addLog('success', `Using ${architectProjects.length} architect-specific projects (all verified as owned by architect user ${userId})`);

      // Step 0a: Disable RLS on architect tables to allow seeding
      addLog('info', 'Disabling RLS on architect tables for seeding...');
      const architectTables = [
        'architect_meetings',
        'architect_tasks',
        'architect_briefings',
        'architect_site_diary',
        'architect_task_comments',
        'architect_moodboard_sections',
        'architect_moodboard_images',
        'architect_moodboard_colors',
        'architect_opportunities',
      ];
      
      for (const table of architectTables) {
        const { error: rlsError } = await supabase.rpc('disable_rls_for_table', { p_table_name: table });
        if (rlsError) {
          addLog('warning', `Failed to disable RLS for ${table}: ${rlsError.message}`);
        } else {
          addLog('info', `Disabled RLS for ${table}`);
        }
      }

      // Step 0b: Ensure pipeline statuses exist (required dependency for test insert and opportunities)
      addLog('info', 'Ensuring pipeline statuses exist before verification...');
      try {
        await seedArchitectPipelineStatuses(batchId);
      } catch (error: any) {
        addLog('error', `Failed to seed pipeline statuses: ${error.message}`);
        throw error;
      }

      // Skip test insert - we'll use RPC function that bypasses RLS for seeding
      addLog('info', 'Skipping permission verification test - using RPC function that bypasses RLS');

      addLog('info', `Found ${existingClients.length} clients and ${architectProjects.length} architect-specific projects`);

      // Step 1: Opportunities (pipeline statuses already seeded in Step 0 above)
      try {
        const opportunities = await seedArchitectOpportunities(existingClients, architectProjects, batchId, userId);
        stats.architect_opportunities = opportunities?.length || 0;
        addLog('info', `Opportunities seeded: ${stats.architect_opportunities}`);
        if (stats.architect_opportunities === 0) {
          addLog('warning', 'WARNING: Opportunities seeding returned 0 records - this may indicate an RLS issue');
        }
      } catch (error: any) {
        addLog('error', `Failed to seed opportunities: ${error.message}`);
        throw error;
      }

      // Step 2: Briefings
      const briefings = await seedArchitectBriefings(architectProjects, batchId, userId);
      stats.architect_briefings = briefings?.length || 0;
      addLog('info', `Briefings seeded: ${stats.architect_briefings}`);

      // Step 3: Meetings
      const meetings = await seedArchitectMeetings(architectProjects, existingClients, batchId, userId);
      stats.architect_meetings = meetings?.length || 0;
      addLog('info', `Meetings seeded: ${stats.architect_meetings}`);

      // Step 4: Tasks
      const tasks = await seedArchitectTasks(architectProjects, existingPhases || [], batchId, userId);
      stats.architect_tasks = tasks?.length || 0;
      addLog('info', `Tasks seeded: ${stats.architect_tasks}`);

      // Step 5: Task Comments
      try {
        const taskComments = await seedArchitectTaskComments(tasks || [], batchId, userId);
        stats.architect_task_comments = taskComments?.length || 0;
        addLog('info', `Task Comments seeded: ${stats.architect_task_comments}`);
        if (stats.architect_task_comments === 0) {
          addLog('warning', 'WARNING: Task Comments seeding returned 0 records - this may indicate an RLS issue');
        }
      } catch (error: any) {
        addLog('error', `Failed to seed task comments: ${error.message}`);
        throw error;
      }

      // Step 6: Site Diary
      const siteDiary = await seedArchitectSiteDiary(architectProjects, batchId, userId);
      stats.architect_site_diary = siteDiary?.length || 0;
      addLog('info', `Site Diary entries seeded: ${stats.architect_site_diary}`);

      // Step 7: Moodboard Sections
      const moodboardSections = await seedArchitectMoodboardSections(architectProjects, batchId, userId);
      stats.architect_moodboard_sections = moodboardSections?.length || 0;
      addLog('info', `Moodboard Sections seeded: ${stats.architect_moodboard_sections}`);

      // Step 8: Moodboard Images
      try {
        const moodboardImages = await seedArchitectMoodboardImages(moodboardSections || [], architectProjects, batchId, userId);
        stats.architect_moodboard_images = moodboardImages?.length || 0;
        addLog('info', `Moodboard Images seeded: ${stats.architect_moodboard_images}`);
        if (stats.architect_moodboard_images === 0) {
          addLog('warning', 'WARNING: Moodboard Images seeding returned 0 records - this may indicate an RLS issue');
        }
      } catch (error: any) {
        addLog('error', `Failed to seed moodboard images: ${error.message}`);
        throw error;
      }

      // Step 9: Moodboard Colors
      const moodboardColors = await seedArchitectMoodboardColors(architectProjects, batchId, userId);
      stats.architect_moodboard_colors = moodboardColors?.length || 0;
      addLog('info', `Moodboard Colors seeded: ${stats.architect_moodboard_colors}`);

      // Calculate total - exclude metadata fields (total, version, timestamp) from the sum
      const recordCounts = [
        stats.architect_projects || 0,
        stats.architect_clients || 0, // Include clients count
        stats.architect_opportunities || 0,
        stats.architect_briefings || 0,
        stats.architect_meetings || 0,
        stats.architect_tasks || 0,
        stats.architect_task_comments || 0,
        stats.architect_site_diary || 0,
        stats.architect_moodboard_sections || 0,
        stats.architect_moodboard_images || 0,
        stats.architect_moodboard_colors || 0,
      ];
      stats.total = recordCounts.reduce((sum, count) => sum + count, 0);
      
      addLog('info', `Total records calculated: ${stats.total} (from ${recordCounts.length} tables)`);
      addLog('info', `Stats breakdown: ${JSON.stringify({
        projects: stats.architect_projects,
        clients: stats.architect_clients,
        opportunities: stats.architect_opportunities,
        briefings: stats.architect_briefings,
        meetings: stats.architect_meetings,
        tasks: stats.architect_tasks,
        taskComments: stats.architect_task_comments,
        siteDiary: stats.architect_site_diary,
        moodboardSections: stats.architect_moodboard_sections,
        moodboardImages: stats.architect_moodboard_images,
        moodboardColors: stats.architect_moodboard_colors,
      })}`);

      // Re-enable RLS on architect tables after seeding
      addLog('info', 'Re-enabling RLS on architect tables after seeding...');
      for (const table of architectTables) {
        const { error: rlsError } = await supabase.rpc('enable_rls_for_table', { p_table_name: table });
        if (rlsError) {
          addLog('warning', `Failed to re-enable RLS for ${table}: ${rlsError.message}`);
        } else {
          addLog('info', `Re-enabled RLS for ${table}`);
        }
      }

      // Save metadata
      await supabase.from('seed_data_registry').insert({
        entity_type: '_metadata',
        entity_id: crypto.randomUUID(),
        seed_batch_id: batchId,
        metadata: {
          version: stats.version,
          timestamp: stats.timestamp,
          totalRecords: stats.total,
          description: 'Architect module seed data generation v1.0.0',
        },
      });

      addLog('success', '✓ All architect seeding steps completed successfully!');
      
      // Final validation: ensure stats object is properly structured
      const finalStats = {
        total: stats.total || 0,
        version: stats.version || 'v1.0.0',
        timestamp: stats.timestamp || new Date().toISOString(),
        architect_projects: stats.architect_projects || 0,
        architect_clients: stats.architect_clients || 0,
        architect_opportunities: stats.architect_opportunities || 0,
        architect_briefings: stats.architect_briefings || 0,
        architect_meetings: stats.architect_meetings || 0,
        architect_tasks: stats.architect_tasks || 0,
        architect_task_comments: stats.architect_task_comments || 0,
        architect_site_diary: stats.architect_site_diary || 0,
        architect_moodboard_sections: stats.architect_moodboard_sections || 0,
        architect_moodboard_images: stats.architect_moodboard_images || 0,
        architect_moodboard_colors: stats.architect_moodboard_colors || 0,
      };
      
      addLog('info', `Final stats object: ${JSON.stringify(finalStats, null, 2)}`);
      
      return { stats: finalStats, message: `Successfully seeded ${finalStats.total} architect records across all tables` };
    } catch (error: any) {
      addLog('error', `✗ Architect seeding failed: ${error.message}`);
      throw error;
    }
  };

  return { 
    fetchArchitectStats, 
    clearArchitectSeedData, 
    executeArchitectSeeding 
  };
}
