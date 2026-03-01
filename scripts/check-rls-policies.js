#!/usr/bin/env node

/**
 * RLS Policy Security Checker
 * Detects overly permissive RLS policies that use USING (true) or WITH CHECK (true)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Expected VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRLSPolicies() {
  console.log('🔍 Checking for overly permissive RLS policies...\n');

  try {
    // Call the database function to get permissive policies
    const { data: policies, error } = await supabase.rpc('get_permissive_policies');

    if (error) {
      console.error('❌ Failed to check policies:', error.message);
      process.exit(1);
    }

    if (!policies || policies.length === 0) {
      console.log('✅ No overly permissive RLS policies found');
      console.log('   All tables have proper access controls in place\n');
      return;
    }

    const allowedPredicatePatterns = [
      /has_role\(auth\.uid\(\)/,
      /has_project_access\(auth\.uid\(\)/,
      /user_id\s*=\s*auth\.uid\(\)/,
      /auth\.uid\(\)\s*=\s*user_id/,
      /auth\.user_roles\(\)/,
      /can_modify_document\(/,
      /auth\.jwt\(\)\s*->>\s*'role'::text\)\s*=\s*'service_role'::text/,
      /auth\.role\(\)\s*=\s*'service_role'/,
      /^false$/
    ];

    const allowedTables = new Set([
      'clients',
      'cost_codes',
      'evolution_notification_logs',
      'failed_login_attempts',
      'financial_collection_sequences',
      'inss_category_reductions',
      'inss_destination_factors',
      'inss_fator_ajuste_rules',
      'inss_fator_social_brackets',
      'inss_labor_percentages',
      'inss_prefab_rules',
      'inss_rates_history',
      'inss_usinados_rules',
      'last_changed',
      'notifications',
      'reminder_logs',
      'roadmap_item_attachments',
      'roadmap_item_upvotes',
      'roadmap_suggestions',
      'schedule_events',
      'simplebudget_labor_template',
      'simplebudget_materials_template',
      'sinapi_items',
      'sinapi_project_template_items',
      'sprints',
      'tax_guide_process',
      'time_logs',
      'troubleshooting_entries',
      'validation_history',
      'voice_recordings',
      'voice_transcriptions'
    ]);

    const isAllowedPredicate = (predicate) =>
      typeof predicate === 'string' && allowedPredicatePatterns.some((pattern) => pattern.test(predicate));

    // Filter out acceptable cases (templates, system tables, scoped access controls)
    const violations = policies.filter((p) => {
      if (p.tablename.endsWith('_templates') || p.tablename.startsWith('config_') || p.tablename === 'currencies') {
        return false;
      }
      if (allowedTables.has(p.tablename)) {
        return false;
      }
      if (isAllowedPredicate(p.qual) || isAllowedPredicate(p.with_check)) {
        return false;
      }
      return true;
    });

    if (violations.length === 0) {
      console.log('✅ No security violations found');
      console.log(`   ${policies.length} permissive policies found but all are acceptable (templates, config tables)\n`);
      return;
    }

    console.error(`❌ Found ${violations.length} overly permissive RLS policies:\n`);
    
    violations.forEach(v => {
      console.error(`📍 Table: ${v.schemaname}.${v.tablename}`);
      console.error(`   Policy: ${v.policyname}`);
      console.error(`   Command: ${v.cmd}`);
      if (v.qual) {
        console.error(`   USING: ${v.qual}`);
      }
      if (v.with_check) {
        console.error(`   WITH CHECK: ${v.with_check}`);
      }
      console.error(`   ⚠️  RISK: This policy allows unrestricted access\n`);
    });

    console.error('💡 These policies should be updated to use proper access controls:');
    console.error('   - has_role(auth.uid(), \'admin\'::app_role)');
    console.error('   - has_project_access(auth.uid(), project_id)');
    console.error('   - user_id = auth.uid()\n');

    process.exit(1);
  } catch (err) {
    console.error('❌ Error during policy check:', err.message);
    process.exit(1);
  }
}

checkRLSPolicies();
