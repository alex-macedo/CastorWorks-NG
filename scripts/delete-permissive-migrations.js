#!/usr/bin/env node

/**
 * delete-permissive-migrations.js
 *
 * Purpose:
 * - Scans ALL migration files in supabase/migrations/ for permissive RLS patterns
 * - Creates a backup of files before deletion
 * - DELETES migration files containing permissive policies
 * - After running, commit and push to GitHub to remove them from Lovable
 *
 * DANGER: This script PERMANENTLY DELETES migration files!
 * 
 * How to run:
 *   1. node scripts/delete-permissive-migrations.js
 *   2. Review the backup in supabase/migrations/.backup-<timestamp>/
 *   3. git add -A
 *   4. git commit -m "Remove permissive RLS migration files"
 *   5. git push origin main
 *
 * After pushing, Lovable will sync and no longer have the deleted migrations.
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// Dangerous RLS patterns to detect
const DANGEROUS_PATTERNS = [
  {
    pattern: /USING\s*\(\s*true\s*\)/gi,
    name: 'USING (true)',
  },
  {
    pattern: /WITH\s+CHECK\s*\(\s*true\s*\)/gi,
    name: 'WITH CHECK (true)',
  },
  {
    pattern: /TO\s+authenticated\s+USING\s*\(\s*true\s*\)/gi,
    name: 'TO authenticated USING (true)',
  },
  {
    pattern: /TO\s+public\s+USING\s*\(\s*true\s*\)/gi,
    name: 'TO public USING (true)',
  },
  {
    pattern: /POLICY\s+"[^"]*Anyone\s+can[^"]*"/gi,
    name: 'Policy name: "Anyone can..."',
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
  const content = fs.readFileSync(filePath, 'utf8');
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
 * Main deletion function
 */
function deletePermissiveMigrations() {
  console.log(`${BOLD}${RED}⚠️  MIGRATION FILE DELETION SCRIPT${RESET}`);
  console.log(`${RED}This will PERMANENTLY DELETE migration files!${RESET}\n`);

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`${RED}Error: Migrations directory not found at ${migrationsDir}${RESET}`);
    process.exit(1);
  }

  // Get all migration files
  const allFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
    .map(f => path.join(migrationsDir, f));

  if (allFiles.length === 0) {
    console.log(`${YELLOW}No migration files found.${RESET}`);
    process.exit(0);
  }

  console.log(`${BLUE}📁 Found ${allFiles.length} migration files${RESET}`);
  console.log(`${BLUE}🔍 Scanning for permissive RLS patterns...${RESET}\n`);

  // Scan for violations
  const violatingFiles = [];
  let totalViolations = 0;

  for (const file of allFiles) {
    const violations = scanMigrationFile(file);
    if (violations.length > 0) {
      const violationCount = violations.reduce((sum, v) => sum + v.count, 0);
      violatingFiles.push({ 
        file, 
        violations, 
        count: violationCount,
        filename: path.basename(file)
      });
      totalViolations += violationCount;
    }
  }

  if (violatingFiles.length === 0) {
    console.log(`${GREEN}✅ No permissive policies found. Nothing to delete!${RESET}`);
    process.exit(0);
  }

  console.log(`${YELLOW}⚠️  Found ${violatingFiles.length} files with ${totalViolations} violations${RESET}\n`);

  // Display files to be deleted
  console.log(`${BOLD}${RED}Files to be DELETED:${RESET}`);
  violatingFiles.forEach(({ filename, count, violations }) => {
    console.log(`  ${RED}✗${RESET} ${filename} (${count} violations)`);
    violations.forEach(v => {
      console.log(`    ${MAGENTA}→${RESET} ${v.pattern}: ${v.count}x`);
    });
  });
  console.log('');

  // Create backup directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
  const backupDir = path.join(migrationsDir, `.backup-${timestamp}`);
  
  console.log(`${BLUE}📦 Creating backup...${RESET}`);
  fs.mkdirSync(backupDir, { recursive: true });

  // Backup and delete files
  let deletedCount = 0;
  let deletedViolations = 0;

  for (const { file, filename, count } of violatingFiles) {
    const backupPath = path.join(backupDir, filename);
    
    try {
      // Backup
      fs.copyFileSync(file, backupPath);
      
      // Delete
      fs.unlinkSync(file);
      
      deletedCount++;
      deletedViolations += count;
      console.log(`  ${RED}✗${RESET} Deleted: ${filename}`);
    } catch (error) {
      console.error(`  ${RED}✗${RESET} Error processing ${filename}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`${BOLD}${GREEN}✅ Deletion Complete${RESET}`);
  console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

  // Summary
  console.log(`${BOLD}Summary:${RESET}`);
  console.log(`  ${RED}•${RESET} Deleted: ${deletedCount} migration files`);
  console.log(`  ${RED}•${RESET} Removed: ${deletedViolations} permissive policy violations`);
  console.log(`  ${BLUE}•${RESET} Backup: ${path.basename(backupDir)}\n`);

  console.log(`${BOLD}${YELLOW}⚠️  CRITICAL NEXT STEPS:${RESET}`);
  console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  1. ${CYAN}Review backup:${RESET} Check ${backupDir}`);
  console.log(`  2. ${CYAN}Commit changes:${RESET}`);
  console.log(`     ${BLUE}git add -A${RESET}`);
  console.log(`     ${BLUE}git commit -m "Remove ${deletedCount} permissive RLS migration files"${RESET}`);
  console.log(`  3. ${CYAN}Push to GitHub:${RESET}`);
  console.log(`     ${BLUE}git push origin main${RESET}`);
  console.log(`  4. ${CYAN}Lovable will sync${RESET} and remove these migrations`);
  console.log(`  5. ${CYAN}Create secure replacement migration${RESET} using:`);
  console.log(`     ${BLUE}node scripts/generate-corrective-migration.js${RESET}\n`);

  console.log(`${BOLD}${RED}⚠️  WARNING:${RESET}`);
  console.log(`${RED}These files are PERMANENTLY DELETED from your local filesystem!${RESET}`);
  console.log(`${RED}Only restore from backup if needed: ${path.basename(backupDir)}${RESET}\n`);

  // List files that remain
  const remainingFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.startsWith('.'));

  if (remainingFiles.length > 0) {
    console.log(`${BOLD}Remaining migrations (${remainingFiles.length}):${RESET}`);
    remainingFiles.slice(0, 10).forEach(f => {
      console.log(`  ${GREEN}✓${RESET} ${f}`);
    });
    if (remainingFiles.length > 10) {
      console.log(`  ... and ${remainingFiles.length - 10} more`);
    }
  } else {
    console.log(`${YELLOW}⚠️  No migration files remain!${RESET}`);
    console.log(`${YELLOW}You MUST create a secure replacement migration before pushing.${RESET}`);
  }

  console.log('');
}

// Run deletion
try {
  deletePermissiveMigrations();
} catch (error) {
  console.error(`${RED}${BOLD}Fatal Error:${RESET} ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
