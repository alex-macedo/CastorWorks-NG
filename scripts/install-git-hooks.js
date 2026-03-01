#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const hooksPath = path.join(repoRoot, '.githooks');

function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: repoRoot,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

function chmodHookFiles() {
  if (!fs.existsSync(hooksPath)) return;

  for (const entry of fs.readdirSync(hooksPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = path.join(hooksPath, entry.name);
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // Best-effort; chmod can fail on Windows or restricted FS.
    }
  }
}

function main() {
  if (!isGitRepo()) return;
  if (!fs.existsSync(hooksPath)) return;

  try {
    execSync('git config --local core.hooksPath .githooks', { cwd: repoRoot, stdio: 'ignore' });
    chmodHookFiles();
  } catch {
    // Best-effort; hook installation shouldn't fail installs.
  }
}

main();

