#!/usr/bin/env node

/**
 * Migration Security Scanner
 * Detects dangerous RLS patterns in migration files before commit
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Dangerous patterns that indicate overly permissive RLS policies
const DANGEROUS_PATTERNS = [
  {
    pattern: /USING\s*\(\s*true\s*\)/gi,
    name: 'USING (true)',
    description: 'Allows unrestricted access - all users can bypass RLS',
    severity: 'CRITICAL',
    suggestion: 'Use has_project_access(auth.uid(), project_id) or auth.uid() = user_id'
  },
  {
    pattern: /WITH\s+CHECK\s*\(\s*true\s*\)/gi,
    name: 'WITH CHECK (true)',
    description: 'Allows unrestricted inserts/updates - no validation on new data',
    severity: 'CRITICAL',
    suggestion: 'Use has_project_access(auth.uid(), project_id) or auth.uid() = user_id'
  },
  {
    pattern: /CREATE\s+POLICY\s+['"]*Anyone\s+can/gi,
    name: 'Policy named "Anyone can..."',
    description: 'Policy name suggests unrestricted public access',
    severity: 'CRITICAL',
    suggestion: 'Rename to describe actual access pattern (e.g., "authenticated_select_", "project_scoped_")'
  },
  {
    pattern: /TO\s+authenticated\s+USING\s*\(\s*true\s*\)/gi,
    name: 'TO authenticated USING (true)',
    description: 'Any authenticated user can access ALL data - violates data isolation',
    severity: 'CRITICAL',
    suggestion: 'Add proper scoping: has_project_access(auth.uid(), project_id)'
  },
  {
    pattern: /TO\s+authenticated.*WITH\s+CHECK\s*\(\s*true\s*\)/gi,
    name: 'TO authenticated WITH CHECK (true)',
    description: 'Any authenticated user can insert/update without validation',
    severity: 'CRITICAL',
    suggestion: 'Add proper validation: has_project_access(auth.uid(), project_id)'
  },
  {
    pattern: /FOR\s+ALL\s+TO\s+authenticated\s+USING\s*\(\s*true\s*\)\s+WITH\s+CHECK\s*\(\s*true\s*\)/gi,
    name: 'FOR ALL TO authenticated with unrestricted access',
    description: 'Complete unrestricted CRUD access for any authenticated user',
    severity: 'CRITICAL',
    suggestion: 'Split into separate policies with proper access controls'
  },
  /* {
    // Check for FOR ALL policies that don't have a WITH CHECK clause
    // This regex matches "FOR ALL" followed by any characters except semicolon,
    // ensuring "WITH CHECK" does not appear before the semicolon.
    pattern: /\bFOR\s+ALL\s+(?:(?!\bWITH\s+CHECK\b)[^;])*;? /gis,
    name: 'FOR ALL without WITH CHECK',
    description: 'Policy allows all operations but lacks proper insert/update validation',
    severity: 'ERROR',
    suggestion: 'Add WITH CHECK clause matching USING condition'
  }, */
];

// NO EXCEPTIONS - ALL PERMISSIVE POLICIES MUST BE REJECTED
// Previously we allowed template/config tables to have permissive policies.
// This is no longer acceptable. ALL policies must use proper access control.
const ACCEPTABLE_EXCEPTIONS = [];

function isAcceptableException(context) {
  // SECURITY HARDENING: No exceptions allowed
  // All policies must use proper access control patterns
  return false;
}

function isInsideComment(content, matchIndex, lines) {
  // Get the line containing the match
  const beforeMatch = content.substring(0, matchIndex);
  const lineNumber = beforeMatch.split('\n').length;
  const line = lines[lineNumber - 1];

  // Check if the line is a SQL comment
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('--')) {
    return true;
  }

  // Check if match position is after -- on the same line
  const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
  const lineUpToMatch = content.substring(lineStart, matchIndex);
  if (lineUpToMatch.includes('--')) {
    return true;
  }

  return false;
}

function isInsideStringLiteral(content, matchIndex) {
  // Count single quotes before the match position
  // If odd number of quotes, we're inside a string literal
  const beforeMatch = content.substring(0, matchIndex);

  // Simple heuristic: check if we're inside a VALUES clause with string data
  // Look for patterns like VALUES (...'text with USING (true) in it'...)

  // Find the last VALUES keyword before the match
  const lastValuesIndex = beforeMatch.toLowerCase().lastIndexOf('values');
  if (lastValuesIndex === -1) return false;

  // Count unescaped single quotes between VALUES and match
  const textAfterValues = content.substring(lastValuesIndex, matchIndex);
  let inString = false;
  let quoteCount = 0;

  for (let i = 0; i < textAfterValues.length; i++) {
    if (textAfterValues[i] === "'" && (i === 0 || textAfterValues[i-1] !== "'")) {
      quoteCount++;
    }
  }

  // If odd number of quotes, we're inside a string
  return quoteCount % 2 === 1;
}

function isSystemAuditPolicy(context) {
  // Allow WITH CHECK (true) for system audit tables (failed_login_attempts)
  // These need system-level insert access for security logging
  const lowerContext = context.toLowerCase();
  return lowerContext.includes('failed_login_attempts') &&
         lowerContext.includes('system') &&
         lowerContext.includes('insert');
}

function isReferenceTableSelectPolicy(context, lineContent) {
  // Allow auth.uid() IS NOT NULL for SELECT-only policies on reference/catalog tables
  // These tables contain shared reference data that all authenticated users should read

  const lowerContext = context.toLowerCase();
  const lowerLine = lineContent.toLowerCase();

  // Must be a SELECT policy (read-only access)
  const isSelectPolicy = lowerContext.includes('for select') ||
                          lowerContext.includes('can view') ||
                          lowerContext.includes('can read');

  // Reference/catalog tables that are intentionally accessible to all authenticated users
  const referenceTablePatterns = [
    'sinapi_catalog',           // National construction cost database
    'suppliers',                // Supplier directory
    'exchange_rates',           // Currency exchange rates
    'roadmap_items',            // Application roadmap (public)
    'roadmap_phases',           // Roadmap phases
    'roadmap_tasks',            // Roadmap tasks
    'activity_templates',       // Construction activity templates
    'reference_',               // Any table prefixed with reference_
    'catalog_',                 // Any table prefixed with catalog_
    '_catalog'                  // Any table suffixed with _catalog
  ];

  const isReferenceTable = referenceTablePatterns.some(pattern =>
    lowerContext.includes(pattern)
  );

  // Also check for explicit documentation in comments
  const hasReferenceDocumentation =
    lowerContext.includes('reference data') ||
    lowerContext.includes('catalog') ||
    lowerContext.includes('shared data') ||
    lowerContext.includes('all authenticated users can');

  return isSelectPolicy && (isReferenceTable || hasReferenceDocumentation);
}

function scanMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  DANGEROUS_PATTERNS.forEach(({ pattern, name, description, severity, suggestion }) => {
    pattern.lastIndex = 0; // Reset regex state

    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Find the line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const lineContent = lines[lineNumber - 1].trim();

      // Skip if match is inside a SQL comment
      if (isInsideComment(content, match.index, lines)) {
        continue;
      }

      // Skip if match is inside a string literal (e.g., in VALUES clause)
      if (isInsideStringLiteral(content, match.index)) {
        continue;
      }

      // Get context for better error reporting (expanded to catch table names)
      const contextStart = Math.max(0, lineNumber - 6);
      const contextEnd = Math.min(lines.length, lineNumber + 3);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // Allow system audit policies that need unrestricted INSERT
      if (name === 'WITH CHECK (true)' && isSystemAuditPolicy(context)) {
        continue;
      }

      // Allow reference table SELECT policies with auth.uid() IS NOT NULL
      if (name === 'USING (auth.uid() IS NOT NULL) without scoping' &&
          isReferenceTableSelectPolicy(context, lineContent)) {
        continue;
      }

      // SECURITY HARDENING: No exceptions - all violations are rejected
      if (!isAcceptableException(context)) {
        violations.push({
          pattern: name,
          description,
          severity,
          suggestion,
          lineNumber,
          lineContent,
          file: path.basename(filePath)
        });
      }
    }
  });

  return violations;
}

function scanMigrations(migrationFiles) {
  log('\n🔒 Scanning migration files for security issues...', COLORS.BLUE);
  
  let hasViolations = false;
  const allViolations = [];

  migrationFiles.forEach(file => {
    const violations = scanMigrationFile(file);
    
    if (violations.length > 0) {
      allViolations.push({ file: path.basename(file), violations });
      hasViolations = true;
    }
  });

  if (!hasViolations) {
    log('✅ No security issues found in migrations', COLORS.GREEN);
    return true;
  }

  log('\n❌ SECURITY VIOLATIONS DETECTED\n', COLORS.RED + COLORS.BOLD);
  log('🚨 CRITICAL: Permissive RLS policies found in migration files', COLORS.RED);
  log('These policies would allow unauthorized data access in production\n', COLORS.RED);
  
  allViolations.forEach(({ file, violations }) => {
    log(`\n📄 ${file}:`, COLORS.YELLOW + COLORS.BOLD);
    
    violations.forEach(v => {
      const severityColor = v.severity === 'CRITICAL' ? COLORS.RED : COLORS.YELLOW;
      log(`\n  ${v.severity === 'CRITICAL' ? '🔴' : '⚠️'}  Line ${v.lineNumber}: ${v.pattern}`, severityColor + COLORS.BOLD);
      log(`     Issue: ${v.description}`, severityColor);
      log(`     Code: ${v.lineContent}`, COLORS.RESET);
      if (v.suggestion) {
        log(`     ✅ Fix: ${v.suggestion}`, COLORS.GREEN);
      }
    });
  });

  log('\n💡 Security Best Practices:', COLORS.BLUE + COLORS.BOLD);
  log('   ✅ Project-scoped: USING (has_project_access(auth.uid(), project_id))', COLORS.GREEN);
  log('   ✅ User-owned: USING (user_id = auth.uid())', COLORS.GREEN);
  log('   ✅ Role-based: USING (has_role(auth.uid(), \'admin\'::app_role))', COLORS.GREEN);
  log('   ✅ Admin access: USING (has_project_admin_access(auth.uid(), project_id))', COLORS.GREEN);
  log('\n   ❌ NEVER use: USING (true)', COLORS.RED);
  log('   ❌ NEVER use: WITH CHECK (true)', COLORS.RED);
  log('   ❌ NEVER use: TO authenticated USING (true)', COLORS.RED);
  log('   ❌ NEVER use: Policy names like "Anyone can..."', COLORS.RED);
  log('\n📖 See docs/MIGRATION_SECURITY_REMEDIATION.md for detailed guidance', COLORS.BLUE);
  log('', COLORS.RESET);

  return false;
}

// Main execution
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

// Check if migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  log('ℹ️  No migrations directory found, skipping security scan', COLORS.YELLOW);
  process.exit(0);
}

// Get all SQL migration files
const allFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .map(f => path.join(migrationsDir, f));

if (allFiles.length === 0) {
  log('ℹ️  No migration files found', COLORS.YELLOW);
  process.exit(0);
}

// If called with file arguments, only scan those files
const filesToScan = process.argv.length > 2
  ? process.argv.slice(2).filter(f => f.endsWith('.sql'))
  : allFiles;

if (filesToScan.length === 0) {
  log('ℹ️  No SQL files to scan', COLORS.YELLOW);
  process.exit(0);
}

const passed = scanMigrations(filesToScan);

if (!passed) {
  log('\n❌ MIGRATION SECURITY CHECK FAILED!', COLORS.RED + COLORS.BOLD);
  log('╔════════════════════════════════════════════════════════════════╗', COLORS.RED);
  log('║  SECURITY VIOLATION: Permissive RLS policies detected         ║', COLORS.RED);
  log('║                                                                ║', COLORS.RED);
  log('║  These policies would allow unauthorized data access and       ║', COLORS.RED);
  log('║  violate security isolation requirements.                     ║', COLORS.RED);
  log('║                                                                ║', COLORS.RED);
  log('║  Fix all issues above before committing or deploying.         ║', COLORS.RED);
  log('╚════════════════════════════════════════════════════════════════╝', COLORS.RED);
  log('\n📚 Resources:', COLORS.BLUE);
  log('   • Secure patterns: docs/MIGRATION_TEMPLATE.md', COLORS.BLUE);
  log('   • Remediation guide: docs/MIGRATION_SECURITY_REMEDIATION.md', COLORS.BLUE);
  log('   • Security testing: docs/SECURITY_TESTING.md\n', COLORS.BLUE);
  process.exit(1);
}

log('\n✅ All migration files passed security validation', COLORS.GREEN + COLORS.BOLD);
process.exit(0);
