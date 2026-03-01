#!/usr/bin/env nodefeat: add version bump scripts to automate versioning based on commit type

/**
 * Automatic Version Bump Script
 * 
 * Bumps the version in package.json based on commit type:
 * - BREAKING CHANGE or feat!: major bump (1.0.0 → 2.0.0)
 * - feat: minor bump (1.0.0 → 1.1.0)
 * - fix, chore, docs, etc: patch bump (1.0.0 → 1.0.1)
 * 
 * Usage:
 *   node scripts/bump-version.js [--type=patch|minor|major] [--dry-run]
 * 
 * If no type is specified, it will try to detect from staged commit message
 * or default to patch.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '..', 'package.json');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: null,
    dryRun: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1];
    }
  }

  return options;
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(version, type) {
  const parsed = parseVersion(version);
  
  switch (type) {
    case 'major':
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
    case 'minor':
      return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
    case 'patch':
    default:
      return formatVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
  }
}

function detectBumpTypeFromCommitMessage() {
  try {
    // Try to get the commit message from COMMIT_EDITMSG (during commit)
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    const commitMsgPath = path.join(gitDir, 'COMMIT_EDITMSG');
    
    if (fs.existsSync(commitMsgPath)) {
      const commitMsg = fs.readFileSync(commitMsgPath, 'utf8').trim();
      return detectBumpType(commitMsg);
    }
  } catch {
    // Not in a commit context
  }
  
  return 'patch'; // Default to patch
}

function detectBumpType(commitMessage) {
  const msg = commitMessage.toLowerCase();
  
  // Check for breaking change
  if (msg.includes('breaking change') || msg.includes('!:')) {
    return 'major';
  }
  
  // Check for feature (minor bump)
  if (msg.startsWith('feat:') || msg.startsWith('feat(')) {
    return 'minor';
  }
  
  // Everything else is a patch
  return 'patch';
}

function updatePackageJson(newVersion, dryRun) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  
  if (!dryRun) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }
  
  return packageJson;
}

function stagePackageJson() {
  try {
    execSync('git add package.json', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const options = parseArgs();
  
  log(`${COLORS.BOLD}📦 CastorWorks Version Bump${COLORS.RESET}`);
  
  const currentVersion = getCurrentVersion();
  log(`   Current version: ${COLORS.CYAN}${currentVersion}${COLORS.RESET}`);
  
  // Determine bump type
  let bumpType = options.type;
  if (!bumpType) {
    bumpType = detectBumpTypeFromCommitMessage();
    log(`   Detected bump type: ${COLORS.YELLOW}${bumpType}${COLORS.RESET}`);
  } else {
    log(`   Specified bump type: ${COLORS.YELLOW}${bumpType}${COLORS.RESET}`);
  }
  
  const newVersion = bumpVersion(currentVersion, bumpType);
  log(`   New version: ${COLORS.GREEN}${newVersion}${COLORS.RESET}`);
  
  if (options.dryRun) {
    log(`\n${COLORS.YELLOW}   [DRY RUN] No changes made${COLORS.RESET}`);
    return;
  }
  
  // Update package.json
  updatePackageJson(newVersion, false);
  log(`   ${COLORS.GREEN}✓${COLORS.RESET} Updated package.json`);
  
  // Stage the updated package.json
  if (stagePackageJson()) {
    log(`   ${COLORS.GREEN}✓${COLORS.RESET} Staged package.json for commit`);
  }
  
  log(`\n${COLORS.GREEN}${COLORS.BOLD}✅ Version bumped: ${currentVersion} → ${newVersion}${COLORS.RESET}`);
}

main();
