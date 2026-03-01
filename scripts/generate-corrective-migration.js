#!/usr/bin/env node

/*
 * generate-corrective-migration.js
 *
 * Purpose:
 * - Connects to your backend database using SUPABASE_DB_URL
 * - Finds ALL permissive RLS policies (USING true / WITH CHECK true / NULL)
 * - Generates a corrective migration that:
 *   1) Explicitly DROPs each offending policy by name
 *   2) Adds secure, properly scoped replacement policies for critical tables
 * - Saves the SQL to supabase/migrations/<timestamp>_corrective_rls_remediation.sql
 *
 * How to run locally:
 *   1) Ensure you have SUPABASE_DB_URL in your environment (Postgres connection string)
 *   2) npm i (installs 'pg' and 'dotenv')
 *   3) node scripts/generate-corrective-migration.js
 *   4) Commit the generated migration and push to GitHub
 *
 * Notes:
 * - This script only WRITES the migration file. It does not apply it.
 * - It focuses on secure replacements for the app's core project-scoped tables.
 * - For tables not covered here, permissive policies are dropped and left locked-down by RLS (no access) until explicitly re-added securely.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

(async function main() {
  console.log(`${BOLD}${CYAN}🔐 Generating Corrective RLS Migration${RESET}`);

  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`${RED}Missing SUPABASE_DB_URL (or DATABASE_URL) in environment.${RESET}`);
    console.error(`Please export it and re-run: e.g. export SUPABASE_DB_URL=postgres://...`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  let client;
  try {
    client = await pool.connect();

    // 1) Fetch ALL permissive policies currently in DB
    const { rows } = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          qual = 'true' OR with_check = 'true' OR qual IS NULL OR with_check IS NULL
        )
      ORDER BY tablename, policyname;
    `);

    if (!rows.length) {
      console.log(`${GREEN}✅ No permissive policies found in database. Nothing to generate.${RESET}`);
      process.exit(0);
    }

    console.log(`${YELLOW}Found ${rows.length} permissive policies. Preparing DROP statements...${RESET}`);

    // 2) Build DROP statements explicitly by name
    const drops = rows.map(r => `DROP POLICY IF EXISTS "${r.policyname.replace(/"/g, '"')}" ON public."${r.tablename}";`).join('\n');

    // 3) Determine affected tables for potential secure replacements
    const affectedTables = Array.from(new Set(rows.map(r => r.tablename)));

    // 4) Secure replacement policies for critical tables
    const secureBlocks = buildSecureReplacementBlocks(affectedTables);

    // 5) Compose migration SQL
    const header = `-- Auto-generated corrective migration to remediate permissive RLS policies\n` +
      `-- Generated at: ${new Date().toISOString()}\n` +
      `-- IMPORTANT: Review before applying.\n\n` +
      `-- Phase 1: Explicitly drop ALL detected permissive policies by name\n`;

    const verification = `\n\n-- Phase 3: Verification - should return 0 rows after applying this migration\n` +
      `DO $$\nDECLARE\n  cnt INTEGER;\nBEGIN\n  SELECT COUNT(*) INTO cnt\n  FROM pg_policies\n  WHERE schemaname = 'public'\n    AND (qual = 'true' OR with_check = 'true' OR qual IS NULL OR with_check IS NULL);\n  IF cnt > 0 THEN\n    RAISE WARNING 'Remaining permissive policies: %', cnt;\n  ELSE\n    RAISE NOTICE 'Permissive policies successfully remediated.';\n  END IF;\nEND $$;\n`;

    const sql = [header, drops, '\n\n-- Phase 2: Create secure replacement policies for critical tables', secureBlocks, verification].join('\n');

    // 6) Write migration file
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    const filename = `${ts}_corrective_rls_remediation.sql`;
    const outPath = path.join(migrationsDir, filename);

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    fs.writeFileSync(outPath, sql, 'utf8');

    console.log(`${GREEN}✅ Generated migration:${RESET} supabase/migrations/${filename}`);
    console.log(`${BLUE}Next:${RESET} Commit and push this migration. Your CI/CD will apply it and remove permissive policies.`);

  } catch (err) {
    console.error(`${RED}Error: ${err.message}${RESET}`);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();

function buildSecureReplacementBlocks(tables) {
  // Build secure policies only for tables present in the DB set, to avoid errors
  const blocks = [];

  const add = (table, sql) => {
    if (tables.includes(table)) blocks.push(`\n-- Secure policies for ${table}\n${sql}`);
  };

  // Helper snippets to avoid recursion; rely on existing security definer functions
  // - public.has_role(uid, role)
  // - public.has_project_access(uid, project_id)
  // - public.has_project_admin_access(uid, project_id)

  add('activity_logs', `
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update activity logs"
  ON public.activity_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete activity logs"
  ON public.activity_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
`);

  add('calendar_events', `
CREATE POLICY "Users can view calendar events for accessible projects"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = calendar_events.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Users can manage calendar events"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (
    project_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = calendar_events.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    project_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
`);

  add('client_project_access', `
CREATE POLICY "Admins and PMs can manage client access"
  ON public.client_project_access FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));
CREATE POLICY "Clients can view their own project access"
  ON public.client_project_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
`);

  add('clients', `
CREATE POLICY "Admins and PMs can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));
CREATE POLICY "Admins and PMs can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));
`);

  add('company_settings', `
CREATE POLICY "Admins can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
`);

  add('digital_signatures', `
CREATE POLICY "Users can view their own signatures"
  ON public.digital_signatures FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own signatures"
  ON public.digital_signatures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own signatures"
  ON public.digital_signatures FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
`);

  add('document_activity_log', `
CREATE POLICY "Users can view activity for accessible documents"
  ON public.document_activity_log FOR SELECT
  TO authenticated
  USING (
    (document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_documents d
      WHERE d.id = document_activity_log.document_id
        AND public.has_project_access(auth.uid(), d.project_id)
    ))
    OR
    (folder_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_folders f
      WHERE f.id = document_activity_log.folder_id
        AND public.has_project_access(auth.uid(), f.project_id)
    ))
  );
CREATE POLICY "Users can create activity logs"
  ON public.document_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
`);

  add('document_permissions', `
CREATE POLICY "Users can view permissions for their documents"
  ON public.document_permissions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_permissions.document_id
      AND public.has_project_access(auth.uid(), d.project_id)
  ));
CREATE POLICY "Users can insert permissions for their documents"
  ON public.document_permissions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_permissions.document_id
      AND public.has_project_access(auth.uid(), d.project_id)
  ));
CREATE POLICY "Users can update permissions for their documents"
  ON public.document_permissions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_permissions.document_id
      AND public.has_project_access(auth.uid(), d.project_id)
  ));
CREATE POLICY "Users can delete permissions for their documents"
  ON public.document_permissions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_permissions.document_id
      AND public.has_project_access(auth.uid(), d.project_id)
  ));
`);

  add('document_version_history', `
CREATE POLICY "Users can view version history for accessible documents"
  ON public.document_version_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_version_history.document_id
      AND (public.has_project_access(auth.uid(), d.project_id)
           OR EXISTS (
             SELECT 1 FROM public.document_permissions p
             WHERE p.document_id = d.id AND p.user_id = auth.uid()
           ))
  ));
CREATE POLICY "Users can create version history"
  ON public.document_version_history FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_documents d
    WHERE d.id = document_version_history.document_id
      AND public.has_project_access(auth.uid(), d.project_id)
  ));
`);

  add('email_notifications', `
CREATE POLICY "Admins can view email notifications"
  ON public.email_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create notifications"
  ON public.email_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
`);

  add('exchange_rates', `
CREATE POLICY "Admins can view exchange rates"
  ON public.exchange_rates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
`);

  add('generated_reports', `
CREATE POLICY "Users can view reports for their projects"
  ON public.generated_reports FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = generated_reports.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Users can manage reports for their projects"
  ON public.generated_reports FOR ALL
  TO authenticated
  USING (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = generated_reports.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
`);

  add('mentions', `
CREATE POLICY "Users can view their own mentions"
  ON public.mentions FOR SELECT
  TO authenticated
  USING (mentioned_user_id = auth.uid());
CREATE POLICY "Users can insert mentions when commenting"
  ON public.mentions FOR INSERT
  TO authenticated
  WITH CHECK (mentioning_user_id = auth.uid());
CREATE POLICY "Users can update their own mention read status"
  ON public.mentions FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = auth.uid());
`);

  add('project_activities', `
CREATE POLICY "Users can view activities for accessible projects"
  ON public.project_activities FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Project admins can insert activities"
  ON public.project_activities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));
CREATE POLICY "Project admins can update activities"
  ON public.project_activities FOR UPDATE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
CREATE POLICY "Project admins can delete activities"
  ON public.project_activities FOR DELETE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
`);

  add('project_benchmarks', `
CREATE POLICY "Admins can view project benchmarks"
  ON public.project_benchmarks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
`);

  add('project_budget_items', `
CREATE POLICY "Users can view budget items for accessible projects"
  ON public.project_budget_items FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Project admins can insert budget items"
  ON public.project_budget_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));
CREATE POLICY "Project admins can update budget items"
  ON public.project_budget_items FOR UPDATE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
CREATE POLICY "Project admins can delete budget items"
  ON public.project_budget_items FOR DELETE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
`);

  add('project_comments', `
CREATE POLICY "Users can view non-deleted comments in accessible projects"
  ON public.project_comments FOR SELECT
  TO authenticated
  USING ((is_deleted = false) AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_comments.project_id
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));
CREATE POLICY "Authenticated users can insert comments"
  ON public.project_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own comments"
  ON public.project_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own comments or admins can delete any"
  ON public.project_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
`);

  add('project_documents', `
CREATE POLICY "Users can view documents for accessible projects"
  ON public.project_documents FOR SELECT
  TO authenticated
  USING ((public.has_project_access(auth.uid(), project_id) AND (is_deleted = false)) OR EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = project_documents.id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can upload documents to accessible projects"
  ON public.project_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Users can update their documents"
  ON public.project_documents FOR UPDATE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id) OR EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = project_documents.id
      AND p.user_id = auth.uid()
      AND p.permission_level = ANY (ARRAY['edit','admin'])
  ));
CREATE POLICY "Users can delete their documents"
  ON public.project_documents FOR DELETE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
`);

  add('daily_logs', `
CREATE POLICY "Users can view daily logs for accessible projects"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Project members can insert daily logs"
  ON public.daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Project admins can update daily logs"
  ON public.daily_logs FOR UPDATE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
CREATE POLICY "Project admins can delete daily logs"
  ON public.daily_logs FOR DELETE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));
`);

  add('failed_login_attempts', `
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view failed login attempts"
  ON public.failed_login_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can record failed login attempts"
  ON public.failed_login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
`);

  return blocks.join('\n');
}
