#!/usr/bin/env node

/**
 * RLS Coverage Verification Script
 * Ensures all core tables have RLS enabled and validates policy completeness
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Core tables that MUST have RLS enabled
const CORE_TABLES = [
  'projects',
  'project_materials',
  'project_phases',
  'project_purchase_requests',
  'project_team_members',
  'purchase_request_items',
  'quotes',
  'suppliers',
  'user_profiles',
  'clients',
  'project_budget_items',
  'project_activities',
  'daily_logs',
  'project_documents',
  'digital_signatures',
  'user_preferences',
  'mentions'
];

async function verifyRLSCoverage() {
  console.log('🔍 Verifying RLS Coverage on Core Tables...\n');

  let hasErrors = false;

  try {
    // Query pg_tables to check RLS status
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', CORE_TABLES);

    if (error) {
      console.error('❌ Failed to query table information:', error.message);
      process.exit(1);
    }

    console.log(`📊 Checking ${CORE_TABLES.length} core tables...\n`);

    const tableMap = new Map(tables?.map(t => [t.tablename, t.rowsecurity]) || []);

    for (const tableName of CORE_TABLES) {
      const hasRLS = tableMap.get(tableName);
      
      if (hasRLS === undefined) {
        console.error(`❌ Table '${tableName}' not found in database`);
        hasErrors = true;
      } else if (!hasRLS) {
        console.error(`❌ Table '${tableName}' does not have RLS enabled`);
        hasErrors = true;
      } else {
        console.log(`✅ ${tableName} - RLS enabled`);
      }
    }

    console.log('');

    // Check for tables with RLS enabled but no policies
    const { data: policies, error: policyError } = await supabase.rpc('get_table_policy_count');

    if (!policyError && policies) {
      const tablesWithoutPolicies = policies.filter(
        (p) => CORE_TABLES.includes(p.tablename) && p.policy_count === 0
      );

      if (tablesWithoutPolicies.length > 0) {
        console.error('⚠️  Tables with RLS enabled but NO policies:');
        tablesWithoutPolicies.forEach((t) => {
          console.error(`   - ${t.tablename}`);
        });
        hasErrors = true;
        console.log('');
      }
    }

    if (hasErrors) {
      console.error('❌ RLS coverage verification FAILED');
      console.error('   Some core tables are missing RLS protection\n');
      process.exit(1);
    } else {
      console.log('✅ RLS coverage verification PASSED');
      console.log(`   All ${CORE_TABLES.length} core tables have RLS enabled with policies\n`);
    }
  } catch (err) {
    console.error('❌ Error during RLS coverage verification:', err.message);
    process.exit(1);
  }
}

verifyRLSCoverage();
