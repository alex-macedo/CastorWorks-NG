#!/usr/bin/node

/**
 * Verification script to ensure agent-browser usage compliance.
 * We use Vercel agent-browser for E2E – NEVER Playwright.
 */

const fs = require('fs');
const path = require('path');

const E2E_DIR = path.join(__dirname, '..', 'e2e');

function hasPlaywrightUsage(content) {
  return (
    content.includes('@playwright/test') ||
    content.includes("require('playwright')") ||
    content.includes('require("playwright")') ||
    content.includes("from 'playwright'") ||
    content.includes('from "playwright"') ||
    content.includes('sync_playwright') ||
    content.includes('playwright.sync_api')
  );
}

console.log('🔍 Verifying agent-browser compliance (no Playwright in e2e)...');

const files = fs.readdirSync(E2E_DIR).filter(
  (f) =>
    f.endsWith('.spec.ts') ||
    f.endsWith('.spec.js') ||
    f.endsWith('.cjs') ||
    f.endsWith('.js') ||
    f.endsWith('.ts') ||
    f.endsWith('.py')
);

let failed = false;
for (const file of files) {
  const filePath = path.join(E2E_DIR, file);
  if (!fs.statSync(filePath).isFile()) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  if (hasPlaywrightUsage(content)) {
    console.error(`❌ Playwright usage in e2e/${file}`);
    console.error('   Use Vercel agent-browser only (see AGENTS.md).');
    failed = true;
  }
}

if (failed) {
  console.error('🚨 CRITICAL: Playwright detected in e2e. Use agent-browser only.');
  process.exit(1);
}

console.log('✅ e2e uses agent-browser only – no Playwright detected.');
