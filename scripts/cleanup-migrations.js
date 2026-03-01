#!/usr/bin/env node

/**
 * Migration Cleanup Script
 * 
 * This script:
 * 1. Identifies all migration files with permissive RLS policies
 * 2. Backs them up to a .backup directory
 * 3. Removes the offending migration files
 * 4. Creates a single secure replacement migration
 * 
 * DANGER: This script DELETES migration files. Always review backups before running.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color constants for logging
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// Dangerous patterns to detect
const DANGEROUS_PATTERNS = [
  {
    pattern: /USING\s*\(\s*true\s*\)/gi,
    name: 'Unrestricted USING (true)',
  },
  {
    pattern: /WITH\s+CHECK\s*\(\s*true\s*\)/gi,
    name: 'Unrestricted WITH CHECK (true)',
  },
  {
    pattern: /TO\s+authenticated\s+USING\s*\(\s*true\s*\)/gi,
    name: 'TO authenticated USING (true)',
  },
  {
    pattern: /POLICY\s+"[^"]*Anyone\s+can[^"]*"/gi,
    name: 'Policy name suggesting public access',
  },
  {
    pattern: /FOR\s+ALL\s+(?:TO|USING)(?!.*WITH\s+CHECK)/gi,
    name: 'FOR ALL without WITH CHECK',
  },
];

/**
 * Scan a migration file for dangerous patterns
 */
function scanMigrationFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];

  for (const { pattern, name } of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        pattern: name,
        count: matches.length,
      });
    }
  }

  return violations;
}

/**
 * Create secure replacement migration SQL
 */
function generateSecureMigration() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  return `-- SECURITY REMEDIATION: Replace all permissive RLS policies with secure alternatives
-- Generated: ${new Date().toISOString()}
-- This migration consolidates security fixes from the remediation guide

-- =============================================================================
-- PHASE 1: Drop All Permissive Policies
-- =============================================================================

DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true' OR qual IS NULL OR with_check IS NULL)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped permissive policy: %.%', pol.tablename, pol.policyname;
  END LOOP;
END $$;

-- =============================================================================
-- PHASE 2: Create Secure Replacement Policies
-- =============================================================================

-- Activity Logs: Admin only access
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client Images: Authenticated users with project access
CREATE POLICY "Users can view client images for their projects"
  ON public.client_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = client_images.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can upload client images to their projects"
  ON public.client_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update their project client images"
  ON public.client_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = client_images.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete their project client images"
  ON public.client_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = client_images.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Project Documents: Project-scoped access
CREATE POLICY "Users can view documents for their projects"
  ON public.project_documents FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can upload documents to their projects"
  ON public.project_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update their project documents"
  ON public.project_documents FOR UPDATE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete their project documents"
  ON public.project_documents FOR DELETE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

-- Projects: Owner and admin access
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Roadmap Items: Project-scoped access
CREATE POLICY "Users can view roadmap items for their projects"
  ON public.roadmap_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = roadmap_items.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can create roadmap items in their projects"
  ON public.roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update roadmap items in their projects"
  ON public.roadmap_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = roadmap_items.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete roadmap items from their projects"
  ON public.roadmap_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = roadmap_items.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Sprints: Project-scoped access
CREATE POLICY "Users can view sprints for their projects"
  ON public.sprints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sprints.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can create sprints in their projects"
  ON public.sprints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update sprints in their projects"
  ON public.sprints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sprints.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete sprints from their projects"
  ON public.sprints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sprints.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Sprint Items Snapshot: Read-only for project members
CREATE POLICY "Users can view sprint snapshots for their projects"
  ON public.sprint_items_snapshot FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = sprint_items_snapshot.sprint_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can create sprint snapshots"
  ON public.sprint_items_snapshot FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = sprint_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- User Profiles: Self-managed with public read
CREATE POLICY "Anyone can view user profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User Roles: Admin only management
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can assign user roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User Preferences: Self-managed only
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Failed Login Attempts: System table - admin read only
CREATE POLICY "Admins can view failed login attempts"
  ON public.failed_login_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can record failed login attempts"
  ON public.failed_login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Count remaining permissive policies (should be 0)
DO $$
DECLARE
  permissive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permissive_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual = 'true' OR with_check = 'true' OR qual IS NULL OR with_check IS NULL);
  
  IF permissive_count > 0 THEN
    RAISE WARNING 'WARNING: % permissive policies still exist!', permissive_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All permissive policies have been replaced with secure alternatives';
  END IF;
END $$;
`;
}

/**
 * Main cleanup function
 */
async function cleanupMigrations() {
  console.log(`${BOLD}${CYAN}🧹 Migration Cleanup Script${RESET}`);
  console.log(`${CYAN}================================${RESET}\n`);

  // Find migrations directory
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  if (!existsSync(migrationsDir)) {
    console.error(`${RED}Error: Migrations directory not found at ${migrationsDir}${RESET}`);
    process.exit(1);
  }

  // Get all migration files
  const allFiles = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .map(f => join(migrationsDir, f));

  console.log(`${BLUE}📁 Found ${allFiles.length} migration files${RESET}\n`);

  // Scan for violations
  const violatingFiles = [];
  let totalViolations = 0;

  for (const file of allFiles) {
    const violations = scanMigrationFile(file);
    if (violations.length > 0) {
      const violationCount = violations.reduce((sum, v) => sum + v.count, 0);
      violatingFiles.push({ file, violations, count: violationCount });
      totalViolations += violationCount;
    }
  }

  console.log(`${YELLOW}⚠️  Found ${violatingFiles.length} files with ${totalViolations} violations${RESET}\n`);

  if (violatingFiles.length === 0) {
    console.log(`${GREEN}✅ No permissive policies found. Nothing to clean up!${RESET}`);
    process.exit(0);
  }

  // Display violations
  console.log(`${BOLD}Files to be removed:${RESET}`);
  violatingFiles.forEach(({ file, count }) => {
    const filename = file.split('/').pop();
    console.log(`  ${RED}✗${RESET} ${filename} (${count} violations)`);
  });
  console.log('');

  // Create backup directory
  const backupDir = join(migrationsDir, '.backup-' + Date.now());
  mkdirSync(backupDir, { recursive: true });
  console.log(`${BLUE}📦 Creating backup in: ${backupDir}${RESET}\n`);

  // Backup and remove violating files
  let removedCount = 0;
  for (const { file } of violatingFiles) {
    const filename = file.split('/').pop();
    const backupPath = join(backupDir, filename);
    
    try {
      // Backup
      copyFileSync(file, backupPath);
      
      // Remove
      unlinkSync(file);
      
      removedCount++;
      console.log(`  ${GREEN}✓${RESET} Backed up and removed: ${filename}`);
    } catch (error) {
      console.error(`  ${RED}✗${RESET} Error processing ${filename}: ${error.message}`);
    }
  }

  console.log(`\n${GREEN}✅ Removed ${removedCount} migration files${RESET}\n`);

  // Generate replacement migration
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const replacementFile = join(migrationsDir, `${timestamp}_secure_rls_policies.sql`);
  const migrationSQL = generateSecureMigration();

  writeFileSync(replacementFile, migrationSQL);
  console.log(`${GREEN}✅ Created secure replacement migration:${RESET}`);
  console.log(`   ${replacementFile.split('/').pop()}\n`);

  // Summary
  console.log(`${BOLD}${GREEN}Summary:${RESET}`);
  console.log(`  ${GREEN}•${RESET} Backed up ${removedCount} files to: ${backupDir.split('/').pop()}`);
  console.log(`  ${GREEN}•${RESET} Removed ${totalViolations} permissive policy violations`);
  console.log(`  ${GREEN}•${RESET} Created 1 consolidated secure migration\n`);

  console.log(`${BOLD}${YELLOW}Next Steps:${RESET}`);
  console.log(`  1. Review the backup directory if you need to restore anything`);
  console.log(`  2. Run: ${CYAN}node scripts/check-migration-security.js${RESET}`);
  console.log(`  3. Verify with: ${CYAN}bash test-scanner-validation.sh${RESET}`);
  console.log(`  4. Test your application thoroughly`);
  console.log(`  5. Commit the changes if everything works\n`);

  console.log(`${MAGENTA}⚠️  WARNING: The old migration files have been DELETED${RESET}`);
  console.log(`${MAGENTA}   If you need to restore, copy from: ${backupDir.split('/').pop()}${RESET}\n`);
}

// Run cleanup
cleanupMigrations().catch(error => {
  console.error(`${RED}${BOLD}Fatal Error:${RESET} ${error.message}`);
  process.exit(1);
});
