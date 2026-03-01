import { createClient as _createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createServiceRoleClient, verifyAdminRole } from '../_shared/authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    await verifyAdminRole(user.id, supabase);

    // Comprehensive list of all tables in the database
    // Since PostgREST doesn't support information_schema queries directly,
    // we maintain a comprehensive list. Tables are tried in order and skipped if they don't exist.
    const knownTables = [
      // Core tables
      'projects',
      'clients',
      'project_phases',
      'project_team_members',
      
      // Financial tables
      'project_financial_entries',
      'project_budget_items',
      
      // Procurement tables
      'project_materials',
      'suppliers',
      'project_purchase_requests',
      'purchase_request_items',
      'quotes',
      
      // Activity & Schedule tables
      'project_activities',
      'activity_resource_assignments',
      'activity_templates',
      'daily_logs',
      'activity_logs',
      
      // Document tables
      'project_documents',
      'document_templates',
      'generated_reports',
      
      // AI Platform tables
      'estimates',
      'estimate_files',
      'ai_chat_messages',
      'ai_feedback',
      'ai_usage_logs',
      'proposals',
      'voice_transcriptions',
      
      // Architect module tables
      'architect_tasks',
      'architect_drawings',
      
      // Settings & Configuration tables
      'app_settings',
      'company_settings',
      'user_preferences',
      'user_roles',
      'seed_data_registry',
    ];
    
    const exportStats = {
      totalTables: 0,
      exportedTables: 0,
      skippedTables: 0,
      totalRows: 0,
      errors: [] as string[],
    };

    let sqlDump = `-- ============================================================================
-- Supabase Database Dump - Complete Data Export
-- ============================================================================
-- Generated: ${new Date().toISOString()}
-- Purpose: Export all database data for migration to another environment
-- 
-- IMPORTANT NOTES:
-- 1. This dump contains DATA only (INSERT statements)
-- 2. Schema (CREATE TABLE statements) should come from migrations
-- 3. For complete local Supabase setup:
--    a. Run migrations: supabase migration up
--    b. Import this data: psql <connection-string> < dump.sql
--
-- IMPORT INSTRUCTIONS:
-- Local Supabase:
--   psql postgresql://postgres:postgres@localhost:54322/postgres < dump.sql
--
-- Supabase CLI:
--   supabase db reset  # Runs migrations first
--   psql $(supabase status | grep DB | awk '{print $3}') < dump.sql
--
-- Production/Remote:
--   psql "postgresql://user:pass@host:5432/dbname" < dump.sql
-- ============================================================================

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

BEGIN;

`;

    // Export data for each table
    for (const tableName of knownTables) {
      exportStats.totalTables++;
      try {
        // Get table data - handle pagination for large tables
        let allRows: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: rows, error: dataError, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .range(from, from + pageSize - 1);

          if (dataError) {
            // Table might not exist or we don't have access - skip it
            if (dataError.code === 'PGRST116' || 
                dataError.message.includes('does not exist') ||
                dataError.message.includes('permission denied')) {
              exportStats.skippedTables++;
              sqlDump += `-- Table: ${tableName} (skipped - does not exist or no access)\n\n`;
              hasMore = false;
              break;
            }
            throw dataError;
          }

          if (rows && rows.length > 0) {
            allRows = allRows.concat(rows);
            from += pageSize;
            // Check if we've got all rows
            hasMore = count !== null ? from < count : rows.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        if (allRows.length === 0) {
          // Table exists but is empty
          exportStats.skippedTables++;
          sqlDump += `-- Table: ${tableName} (empty - no data to export)\n\n`;
          continue;
        }

        exportStats.exportedTables++;
        exportStats.totalRows += allRows.length;

        // Generate INSERT statements
        sqlDump += `-- ========================================================================\n`;
        sqlDump += `-- Table: ${tableName}\n`;
        sqlDump += `-- Rows: ${allRows.length}\n`;
        sqlDump += `-- ========================================================================\n\n`;

        // Helper function to escape SQL values
        const escapeSqlValue = (value: any): string => {
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (typeof value === 'number') {
            // Handle NaN and Infinity
            if (!isFinite(value)) return 'NULL';
            return String(value);
          }
          if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          }
          if (typeof value === 'object') {
            // Handle JSON/JSONB - properly escape the JSON string
            const jsonStr = JSON.stringify(value);
            // Escape single quotes and backslashes for SQL
            const escaped = jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "''");
            return `'${escaped}'::jsonb`;
          }
          // String - escape single quotes, backslashes, and control characters
          const str = String(value);
          // Escape: single quotes, backslashes, and wrap in quotes
          const escaped = str
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/'/g, "''")     // Escape single quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t');  // Escape tabs
          return `'${escaped}'`;
        };

        // Process rows in batches to generate INSERT statements
        const batchSize = 100;
        for (let i = 0; i < allRows.length; i += batchSize) {
          const batch = allRows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const columns = Object.keys(row);
            const values = columns.map(col => escapeSqlValue(row[col]));

            sqlDump += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
          }
        }

        sqlDump += '\n';

      } catch (error: any) {
        exportStats.skippedTables++;
        const errorMsg = error.message || String(error);
        exportStats.errors.push(`${tableName}: ${errorMsg}`);
        console.error(`Error exporting table ${tableName}:`, error);
        sqlDump += `-- ERROR exporting table ${tableName}: ${errorMsg}\n\n`;
      }
    }

    // Commit transaction and re-enable triggers
    sqlDump += `\nCOMMIT;\n\n`;
    sqlDump += `-- Re-enable triggers\n`;
    sqlDump += `SET session_replication_role = DEFAULT;\n\n`;
    
    // Add export summary
    sqlDump += `-- ============================================================================\n`;
    sqlDump += `-- EXPORT SUMMARY\n`;
    sqlDump += `-- ============================================================================\n`;
    sqlDump += `-- Total tables processed: ${exportStats.totalTables}\n`;
    sqlDump += `-- Tables exported: ${exportStats.exportedTables}\n`;
    sqlDump += `-- Tables skipped: ${exportStats.skippedTables}\n`;
    sqlDump += `-- Total rows exported: ${exportStats.totalRows}\n`;
    if (exportStats.errors.length > 0) {
      sqlDump += `-- Errors encountered: ${exportStats.errors.length}\n`;
      exportStats.errors.forEach(err => {
        sqlDump += `--   - ${err}\n`;
      });
    }
    sqlDump += `-- ============================================================================\n`;

    // Return the SQL dump as a downloadable file
    return new Response(sqlDump, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="supabase-dump-${new Date().toISOString().split('T')[0]}.sql"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to export database';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

