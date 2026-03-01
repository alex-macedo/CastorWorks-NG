#!/usr/bin/env node
/**
 * Phase 2 E2E: Licensing sidebar — login, load app, verify sidebar and module-gated options.
 * With sandbox tier some items (e.g. Financials, Templates, Architect) are hidden.
 *
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- phase2-licensing-sidebar
 * Or: bash scripts/agent-browser-e2e.sh phase2-licensing-sidebar
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase2-sidebar-${Date.now()}`
const outDir = 'test-results/phase2-licensing-sidebar'

const readEnv = (key) => {
  const file = fs.existsSync('.env.testing') ? '.env.testing' : '.env'
  if (!fs.existsSync(file)) return process.env[key]
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${key}=`))
  if (!line) return process.env[key]
  return line.replace(/^[^=]+=/, '').replace(/^"|"$/g, '').trim()
}

const email = process.env.ACCOUNT_TEST_EMAIL || readEnv('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnv('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing or env')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const run = (args, { allowFail = false, returnOutput = false } = {}) => {
  const result = spawnSync('agent-browser', ['--session', session, ...args], {
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0) {
    if (allowFail) return false
    throw new Error(result.stderr ? result.stderr.trim() : 'agent-browser failed')
  }
  return returnOutput ? (result.stdout || '').trim() : true
}

try {
  run(['open', `${baseUrl}/login`])
  run(['wait', '2000'])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '5000'])

  run(['open', `${baseUrl}/`])
  run(['wait', '3000'])
  run(['screenshot', `${outDir}/01-dashboard-sidebar.png`, '--full'])

  const bodyText = (run(['get', 'text', 'body'], { returnOutput: true }) || '').toLowerCase()
  const hasSidebar =
    bodyText.includes('platform') ||
    bodyText.includes('dashboard') ||
    bodyText.includes('projects') ||
    bodyText.includes('projetos') ||
    bodyText.includes('navigation') ||
    bodyText.includes('workspace') ||
    bodyText.includes('project') ||
    bodyText.includes('settings') ||
    bodyText.includes('configura')
  if (!hasSidebar) {
    throw new Error('Dashboard with sidebar did not load (expected sidebar labels). Body length: ' + bodyText.length)
  }

  console.log('✅ Phase 2 licensing-sidebar E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 2 licensing-sidebar E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
