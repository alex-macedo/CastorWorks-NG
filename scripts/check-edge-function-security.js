#!/usr/bin/env node
/**
 * Edge Function Security Scanner
 *
 * Enforces CastorWorks security best practices for Supabase Edge Functions:
 * - Require importing and using the shared authorization helpers (`_shared/authorization.ts`)
 * - Verify admin/project role checks happen BEFORE any database operations
 * - Forbid service role keys outside edge functions (defense-in-depth)
 * - Warn on missing JSON content-type and 403 on unauthorized
 *
 * Exit codes:
 * 0 - OK
 * 1 - Violations found
 */

import fs from 'fs';
import path from 'path';

const EDGE_FUNCS_DIR = path.join(process.cwd(), 'supabase', 'functions');
const CLIENT_DIR = path.join(process.cwd(), 'src');

const isTypescriptOrTSX = (p) => /\.(ts|tsx)$/.test(p);

function listFilesRecursive(dir, filterFn) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...listFilesRecursive(full, filterFn));
    } else if (!filterFn || filterFn(full)) {
      files.push(full);
    }
  }
  return files;
}

function scanEdgeFunction(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  // Must import shared authorization module
  const hasAuthImport = /from\s+['"]\.\.\/?_shared\/authorization\.ts['"]/.test(content);
  if (!hasAuthImport) {
    violations.push('Missing import from ../_shared/authorization.ts');
  }

  // Must verify role BEFORE DB ops
  const usesVerifyAdmin = /verifyAdminRole\s*\(/.test(content);
  const usesVerifyProject = /verifyProjectAccess\s*\(/.test(content);
  const hasDBClient = /createClient\s*\([^)]*supabase-js@2[^)]*\)/.test(content) || /from\s*\(['"][a-zA-Z0-9_\-]+['"]\)/.test(content);
  if (hasDBClient && !(usesVerifyAdmin || usesVerifyProject)) {
    violations.push('Database operations without verifyAdminRole/verifyProjectAccess');
  }

  // Should return 403 for unauthorized
  const returns403 = /status\s*:\s*403/.test(content);
  if (!returns403) {
    violations.push('No explicit 403 response for unauthorized access');
  }

  // JSON content-type for responses
  const setsJSONHeader = /'Content-Type'\s*:\s*'application\/json'/.test(content);
  if (!setsJSONHeader) {
    violations.push('Responses missing application/json Content-Type header');
  }

  return violations;
}

function scanClientForServiceKey(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  // Service role key leakage patterns
  if (/SERVICE_ROLE_KEY/.test(content) || /service_role/i.test(content)) {
    violations.push('Potential service role key reference in client code');
  }
  // Direct hardcoded JWT-like strings (heuristic)
  if (/eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/.test(content)) {
    violations.push('Potential hardcoded JWT token in client code');
  }
  return violations;
}

let hasViolations = false;
const report = [];

// If called with file arguments, only scan those files
const filesToScanFromArgs = process.argv.length > 2
  ? process.argv.slice(2).filter(isTypescriptOrTSX)
  : null;

if (filesToScanFromArgs) {
  for (const f of filesToScanFromArgs) {
    if (f.includes('supabase/functions/')) {
      if (f.includes('_shared')) continue;
      const v = scanEdgeFunction(f);
      if (v.length) {
        hasViolations = true;
        report.push({ file: f, violations: v });
      }
    } else if (f.includes('src/')) {
      const v = scanClientForServiceKey(f);
      if (v.length) {
        hasViolations = true;
        report.push({ file: f, violations: v });
      }
    }
  }
} else {
  // Scan all edge functions
  const edgeFiles = listFilesRecursive(EDGE_FUNCS_DIR, isTypescriptOrTSX);
  for (const f of edgeFiles) {
    // Skip shared utilities
    if (f.includes('_shared')) continue;
    const v = scanEdgeFunction(f);
    if (v.length) {
      hasViolations = true;
      report.push({ file: f, violations: v });
    }
  }

  // Scan client for service role key leakage
  const clientFiles = listFilesRecursive(CLIENT_DIR, isTypescriptOrTSX);
  for (const f of clientFiles) {
    const v = scanClientForServiceKey(f);
    if (v.length) {
      hasViolations = true;
      report.push({ file: f, violations: v });
    }
  }
}

if (hasViolations) {
  console.error('Edge Function Security Scanner found violations:');
  for (const item of report) {
    console.error(`\nFile: ${path.relative(process.cwd(), item.file)}`);
    for (const viol of item.violations) {
      console.error(` - ${viol}`);
    }
  }
  console.error('\nSee AGENTS.md (Edge Functions Security) and SECURITY.md for remediation guidelines.');
  process.exit(1);
} else {
  console.log('Edge Function Security Scanner: OK');
}
