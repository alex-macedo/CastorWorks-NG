#!/usr/bin/env node
/**
 * Hardcoded String Auditor
 *
 * Scans all TSX/TS source files for string literals that appear directly in JSX
 * without being wrapped in a translation function (t(), i18n.t(), etc.).
 *
 * Detects two categories:
 *   1. JSX text nodes with English-looking words (e.g. <Button>Save</Button>)
 *   2. Attribute values that look like UI labels (placeholder=, title=, aria-label=, etc.)
 *
 * Run: node scripts/audit-hardcoded-strings.cjs [--fail] [--report]
 */

'use strict'

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// ─── Config ──────────────────────────────────────────────────────────────────

const SRC_DIR = path.join(__dirname, '../src')
const REPORT_PATH = path.join(__dirname, '../hardcoded-strings-report.json')
const FAIL_ON_ISSUES = process.argv.includes('--fail') || process.env.CI === 'true'
const WRITE_REPORT = process.argv.includes('--report')

// Attributes whose string values are often UI-facing text
const UI_ATTRIBUTES = new Set([
  'placeholder', 'title', 'aria-label', 'aria-description',
  'aria-placeholder', 'tooltip', 'label', 'alt', 'description',
])

// Patterns that are clearly NOT user-facing text — skip them
const IGNORE_PATTERNS = [
  /^https?:\/\//,            // URLs
  /^\//,                     // paths
  /^[a-z][a-zA-Z0-9:._-]*$/, // camelCase, kebab-case, ids, class names
  /^[A-Z_]+$/,               // CONSTANTS
  /^\d/,                     // starts with digit
  /^[#.]/,                   // CSS selectors
  /^\s*$/,                   // whitespace only
  /^(true|false|null|undefined)$/, // literals
  /^[a-z]{1,2}$/,            // very short technical strings
]

// Common English UI words that should never appear hardcoded
const SUSPICIOUS_UI_WORDS = new Set([
  'save', 'cancel', 'submit', 'delete', 'edit', 'create', 'add', 'remove',
  'update', 'close', 'open', 'search', 'filter', 'sort', 'export', 'import',
  'upload', 'download', 'print', 'share', 'send', 'back', 'next', 'previous',
  'confirm', 'approve', 'reject', 'loading', 'error', 'success', 'warning',
  'required', 'optional', 'settings', 'profile', 'logout', 'login', 'signup',
  'password', 'email', 'name', 'phone', 'address', 'description', 'notes',
  'title', 'status', 'type', 'category', 'date', 'amount', 'total', 'view',
  'details', 'overview', 'summary', 'report', 'dashboard', 'home', 'menu',
  'projects', 'tasks', 'files', 'documents', 'messages', 'notifications',
  'help', 'support', 'about', 'contact', 'terms', 'privacy',
])

// Files/directories to skip
const SKIP_PATHS = [
  'src/locales/', 'src/lib/i18n/', 'node_modules/', 'dist/',
  '.test.', '.spec.', '.stories.',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
}
const log = (color, msg) => console.log(`${colors[color]}${msg}${colors.reset}`)

function shouldSkip(filePath) {
  return SKIP_PATHS.some(p => filePath.includes(p))
}

function isIgnoredString(str) {
  const trimmed = str.trim()
  if (trimmed.length < 3) return true
  return IGNORE_PATTERNS.some(re => re.test(trimmed))
}

function isSuspiciousEnglish(str) {
  const words = str.trim().toLowerCase().split(/\s+/)
  return words.some(w => SUSPICIOUS_UI_WORDS.has(w.replace(/[^a-z]/g, '')))
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length
}

/**
 * Find JSX text nodes — text between tags that isn't a JS expression
 * e.g. <Button>Save</Button>  →  "Save" is flagged
 */
function findJSXTextNodes(content, lines) {
  const findings = []
  const pattern = />\s*([A-Z][^<{}\n]{2,60}?)\s*</g

  for (const match of content.matchAll(pattern)) {
    const text = match[1].trim()
    if (isIgnoredString(text)) continue
    if (!isSuspiciousEnglish(text)) continue

    const lineNum = lineNumberAt(content, match.index)
    const lineContent = lines[lineNum - 1] || ''

    // Skip comment lines
    const trimmedLine = lineContent.trim()
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) continue
    // Skip lines that already use t()
    if (lineContent.includes("t('") || lineContent.includes('t("') || lineContent.includes('t(`')) continue

    findings.push({ line: lineNum, text, type: 'jsx-text', context: lineContent.trim() })
  }
  return findings
}

/**
 * Find hardcoded UI attribute values like placeholder="Enter name"
 */
function findHardcodedAttributes(content, lines) {
  const findings = []
  const attrNames = [...UI_ATTRIBUTES].join('|')
  const pattern = new RegExp(`(${attrNames})=["']([^"'{}]{3,80})["']`, 'g')

  for (const match of content.matchAll(pattern)) {
    const attr = match[1]
    const value = match[2].trim()
    if (isIgnoredString(value)) continue
    if (!isSuspiciousEnglish(value)) continue

    const lineNum = lineNumberAt(content, match.index)
    const lineContent = lines[lineNum - 1] || ''

    const trimmedLine = lineContent.trim()
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) continue

    findings.push({ line: lineNum, text: value, type: `attr:${attr}`, context: lineContent.trim() })
  }
  return findings
}

// ─── Main ────────────────────────────────────────────────────────────────────

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  return [
    ...findJSXTextNodes(content, lines),
    ...findHardcodedAttributes(content, lines),
  ]
}

function run() {
  log('cyan', '🔍 Auditing source files for hardcoded English strings...\n')

  const files = glob.sync(`${SRC_DIR}/**/*.{tsx,ts}`, { nodir: true })
    .filter(f => !shouldSkip(f))

  log('gray', `   Scanning ${files.length} files...\n`)

  const results = {}
  let totalIssues = 0

  for (const file of files) {
    const findings = auditFile(file)
    if (findings.length > 0) {
      const rel = path.relative(process.cwd(), file)
      results[rel] = findings
      totalIssues += findings.length
    }
  }

  // ── Report ──
  if (totalIssues === 0) {
    log('green', '✅ No hardcoded English strings detected!')
  } else {
    log('yellow', `⚠️  Found ${totalIssues} potential hardcoded strings in ${Object.keys(results).length} files:\n`)

    for (const [file, findings] of Object.entries(results)) {
      log('red', `  📄 ${file}`)
      for (const f of findings) {
        console.log(`     ${colors.gray}L${f.line}${colors.reset} [${f.type}] "${f.text}"`)
        console.log(`     ${colors.gray}↳ ${f.context.slice(0, 120)}${colors.reset}`)
      }
      console.log('')
    }
  }

  if (WRITE_REPORT) {
    const report = {
      timestamp: new Date().toISOString(),
      totalIssues,
      filesScanned: files.length,
      filesWithIssues: Object.keys(results).length,
      findings: results,
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
    log('cyan', `📄 Report saved to: ${REPORT_PATH}`)
  }

  if (totalIssues > 0 && FAIL_ON_ISSUES) {
    log('red', '\n❌ Hardcoded string audit failed.')
    process.exit(1)
  }

  return { totalIssues, results }
}

if (require.main === module) run()
module.exports = { run }
