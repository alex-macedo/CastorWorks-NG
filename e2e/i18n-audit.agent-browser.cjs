#!/usr/bin/env node
/**
 * i18n Runtime Audit — agent-browser E2E
 *
 * Visits every major authenticated route in pt-BR, es-ES, and fr-FR and
 * checks the rendered DOM for:
 *   1. i18n key placeholders  — text like "common.save" or "projects.title"
 *      (a key that was never resolved to a translation)
 *   2. Hardcoded English words — common UI words that must be translated
 *      (e.g. "Save", "Cancel", "Loading..." appearing on a pt-BR page)
 *
 * Language is forced via localStorage so no UI interaction is needed.
 *
 * Usage:
 *   node e2e/i18n-audit.agent-browser.cjs [--lang pt-BR,es-ES,fr-FR] [--fail]
 *   BASE_URL=http://localhost:5173 node e2e/i18n-audit.agent-browser.cjs
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = `e2e-i18n-audit-${Date.now()}`
const OUT_DIR = path.join('test-results', 'i18n-audit')
const FAIL_ON_ISSUES = process.argv.includes('--fail') || process.env.CI === 'true'

const langArg = process.argv.find(a => a.startsWith('--lang='))
const LANGUAGES = langArg
  ? langArg.replace('--lang=', '').split(',').map(s => s.trim())
  : ['pt-BR', 'es-ES', 'fr-FR']

// i18n key pattern: namespace segments with camelCase keys, 2+ levels deep.
// e.g. "common.save", "projects.detail.title", "financialInvoice.status.paid"
// Excludes TLDs like .com, .org, .net, .br, .fr, .es (≤4 chars) to avoid false positives on URLs/emails.
const TLDS = new Set(['com', 'org', 'net', 'io', 'br', 'fr', 'es', 'co', 'uk', 'de', 'app', 'dev', 'gov', 'edu'])
function looksLikeI18nKey(text) {
  if (!text || text.includes('@') || text.includes('/') || text.includes('http')) return false
  const parts = text.trim().split('.')
  if (parts.length < 2) return false
  // All parts must be identifier-like (no spaces, 3+ chars each)
  if (!parts.every(p => /^[a-zA-Z][a-zA-Z0-9_]{2,}$/.test(p))) return false
  // The last segment must not be a known TLD
  if (TLDS.has(parts[parts.length - 1].toLowerCase())) return false
  // The whole thing must not be too long (real keys are short)
  if (text.length > 60) return false
  return true
}

// English UI words that should NEVER appear on a non-English page
// (match case-insensitively in DOM text)
const HARDCODED_EN_WORDS = [
  'Save', 'Cancel', 'Submit', 'Delete', 'Edit', 'Create', 'Add new', 'Remove',
  'Update', 'Close', 'Search', 'Filter', 'Export', 'Import', 'Upload', 'Download',
  'Print', 'Share', 'Send', 'Next', 'Previous', 'Confirm', 'Approve', 'Reject',
  'Loading', 'Settings', 'Log out', 'Logout', 'Sign in', 'Sign up',
  'Dashboard', 'Overview', 'Summary', 'Details', 'View all',
  'No results found', 'No data available', 'Something went wrong',
  'Please wait', 'Try again', 'Back to', 'Go back',
]

// Words that are legitimately English even in non-English UIs (brand names, loanwords, tech terms)
const ALLOWED_ENGLISH = new Set([
  'CastorWorks', 'Supabase', 'PDF', 'AI', 'ID', 'URL', 'API', 'OK',
  'WhatsApp', 'RDO', 'BDI', 'WBS', 'QR', 'Gantt', 'KPI',
  // "Dashboard" is a widely-accepted anglicism in pt-BR/es-ES/fr-FR tech UIs
  'Dashboard',
])

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m',
}
const log = (color, msg) => console.log(`${colors[color]}${msg}${colors.reset}`)

function readEnv(key) {
  for (const file of ['.env.testing', '.env.local', '.env']) {
    if (!fs.existsSync(file)) continue
    const line = fs.readFileSync(file, 'utf8').split('\n').find(l => l.startsWith(`${key}=`))
    if (line) return line.replace(/^[^=]+=/, '').replace(/^"|"$/g, '').trim()
  }
  return process.env[key]
}

// Resolve credentials and determine scope BEFORE building route list
const email = readEnv('ACCOUNT_TEST_EMAIL')
const password = readEnv('ACCOUNT_TEST_EMAIL_PASSWORD')
const PUBLIC_ONLY = !email || !password

// Public routes (no auth needed)
const PUBLIC_ROUTES = [
  { path: '/login', label: 'Login page' },
  { path: '/forgot-password', label: 'Forgot password' },
  { path: '/portal-error', label: 'Portal error' },
]

// Protected routes (require authentication)
const PROTECTED_ROUTES = [
  { path: '/', label: 'Dashboard' },
  { path: '/projects', label: 'Projects list' },
  { path: '/financial', label: 'Financial overview' },
  { path: '/financial-ledger', label: 'Financial ledger' },
  { path: '/finance/cashflow', label: 'Cashflow' },
  { path: '/finance/ar', label: 'Accounts receivable' },
  { path: '/finance/ap', label: 'Accounts payable' },
  { path: '/overall-status', label: 'Overall status' },
  { path: '/forms', label: 'Forms list' },
  { path: '/settings', label: 'Settings' },
  { path: '/budget-templates', label: 'Budget templates' },
  { path: '/procurement', label: 'Procurement' },
  { path: '/schedule', label: 'Schedule' },
  { path: '/contacts', label: 'Contacts' },
  { path: '/budget-control', label: 'Budget control' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/maintenance', label: 'Maintenance' },
]

const ROUTES = PUBLIC_ONLY
  ? PUBLIC_ROUTES
  : [...PUBLIC_ROUTES, ...PROTECTED_ROUTES]

if (PUBLIC_ONLY) {
  log('yellow', '⚠️  No credentials found — running public-pages audit only.')
  log('yellow', '   Add ACCOUNT_TEST_EMAIL + ACCOUNT_TEST_EMAIL_PASSWORD to .env.testing for full audit.\n')
}

function ab(args, opts = {}) {
  const result = spawnSync('agent-browser', ['--session', SESSION, ...args], {
    encoding: 'utf8',
    shell: false,
    timeout: 30000,
  })
  if (opts.returnOutput) return (result.stdout || '').trim()
  if (result.status !== 0 && !opts.allowFail) {
    if (opts.warnOnFail) {
      log('gray', `   [warn] agent-browser ${args[0]}: ${(result.stderr || '').slice(0, 80)}`)
      return false
    }
    throw new Error(`agent-browser failed: ${(result.stderr || result.stdout || '').slice(0, 200)}`)
  }
  return result.status === 0
}

// Force localStorage language so i18next picks it up on next page load
function setLanguage(lang) {
  const script = `
    localStorage.setItem('user-preferences-cache', JSON.stringify({
      language: '${lang}',
      currency: 'BRL',
      theme: 'light'
    }));
    document.documentElement.lang = '${lang}';
    'ok'
  `
  ab(['eval', script], { allowFail: true })
}

function login() {
  log('gray', '   Logging in...')
  ab(['open', `${BASE_URL}/login`])
  ab(['wait', '2000'])
  ab(['fill', '#email', email])
  ab(['fill', '#password', password])
  ab(['click', 'button[type=submit]'])
  ab(['wait', '4000'])
}

// Extract visible UI text from the page.
// agent-browser eval returns the JS result as a quoted JSON string, e.g.  "[\"Save\",\"Cancel\"]"
// We need to unwrap that outer quoting.
const DOM_TEXT_SCRIPT = (
  'JSON.stringify(' +
  '[...document.querySelectorAll("button,label,h1,h2,h3,h4,p,span,td,th,li,a,input[placeholder]")]' +
  '.map(el => el.tagName === "INPUT" ? el.getAttribute("placeholder") : el.textContent.trim())' +
  '.filter(t => t && t.length > 2 && t.length < 200)' +
  ')'
)

function getPageTexts() {
  const raw = ab(['eval', DOM_TEXT_SCRIPT], { returnOutput: true, allowFail: true })
  if (!raw) return []
  try {
    // agent-browser wraps the result in outer double-quotes: "\"[...]\"" or directly "[...]"
    let str = raw.trim()
    // If it's a quoted string like "\"[...]\"", remove the outer quotes and unescape
    if (str.startsWith('"') && str.endsWith('"')) {
      str = JSON.parse(str) // unwrap outer quoting
    }
    return JSON.parse(str)
  } catch {
    return []
  }
}

// ─── Analyzers ───────────────────────────────────────────────────────────────

function detectI18nKeyPlaceholders(texts) {
  const issues = []
  for (const text of texts) {
    const trimmed = text.trim()
    // Must have no spaces (a key rendered as text will never have spaces)
    if (trimmed.includes(' ')) continue
    if (looksLikeI18nKey(trimmed)) {
      issues.push({ text: trimmed, type: 'key-placeholder' })
    }
  }
  return issues
}

function detectHardcodedEnglish(texts, lang) {
  if (lang === 'en-US') return [] // not applicable for English
  const issues = []
  for (const en of HARDCODED_EN_WORDS) {
    if (ALLOWED_ENGLISH.has(en)) continue
    // Use word-boundary regex so "Export" doesn't fire on "Exportar" / "Exporter"
    const wordBoundaryRe = new RegExp(`(?<![a-zA-Z])${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z])`, 'i')
    const found = texts.find(t => wordBoundaryRe.test(t))
    if (found) {
      issues.push({ text: en, found: found.slice(0, 80), type: 'hardcoded-english' })
    }
  }
  return issues
}

// ─── Main ────────────────────────────────────────────────────────────────────

function auditRoute(route, lang) {
  setLanguage(lang)
  ab(['open', `${BASE_URL}${route.path}`], { allowFail: true })
  ab(['wait', '3000'], { allowFail: true })

  const texts = getPageTexts()
  const keyIssues = detectI18nKeyPlaceholders(texts)
  const enIssues = detectHardcodedEnglish(texts, lang)

  const allIssues = [...keyIssues, ...enIssues]
  return { route: route.path, label: route.label, lang, texts: texts.length, issues: allIssues }
}

function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  log('cyan', `${colors.bold}🌐 i18n Runtime Audit${colors.reset}`)
  log('cyan', `   Base URL : ${BASE_URL}`)
  log('cyan', `   Languages: ${LANGUAGES.join(', ')}`)
  log('cyan', `   Routes   : ${ROUTES.length}\n`)

  if (!PUBLIC_ONLY) login()

  const allResults = []

  for (const lang of LANGUAGES) {
    log('bold', `\n── ${lang} ─────────────────────────────────`)

    for (const route of ROUTES) {
      process.stdout.write(`   ${route.label.padEnd(30)} `)
      let result
      try {
        result = auditRoute(route, lang)
      } catch (err) {
        result = { route: route.path, label: route.label, lang, texts: 0, issues: [], error: err.message }
      }

      if (result.error) {
        log('gray', `[skip] ${result.error.slice(0, 60)}`)
      } else if (result.issues.length === 0) {
        log('green', `✅ clean (${result.texts} text nodes)`)
      } else {
        log('red', `❌ ${result.issues.length} issue(s)`)
        for (const issue of result.issues) {
          if (issue.type === 'key-placeholder') {
            log('yellow', `      [key] "${issue.text}"`)
          } else {
            log('yellow', `      [en]  "${issue.text}" in: "${issue.found}"`)
          }
        }
      }

      // Screenshot on issues
      if (result.issues && result.issues.length > 0) {
        const screenshotName = `${lang}-${route.label.replace(/\s+/g, '-').toLowerCase()}.png`
        ab(['screenshot', path.join(OUT_DIR, screenshotName), '--full'], { allowFail: true, warnOnFail: true })
      }

      allResults.push(result)
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalIssues = allResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0)
  const routesWithIssues = allResults.filter(r => r.issues?.length > 0).length

  log('cyan', '\n─────────────────────────────────────────')
  if (totalIssues === 0) {
    log('green', '✅ All pages clean — no i18n issues detected!')
  } else {
    log('red', `❌ ${totalIssues} issue(s) across ${routesWithIssues} page/language combinations`)
  }

  // ── Write JSON report ─────────────────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    languages: LANGUAGES,
    totalRoutes: ROUTES.length,
    summary: { totalIssues, routesWithIssues },
    results: allResults,
  }
  const reportPath = path.join(OUT_DIR, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  log('cyan', `📄 Report: ${reportPath}`)

  if (totalIssues > 0 && FAIL_ON_ISSUES) {
    process.exit(1)
  }

  return report
}

run()
