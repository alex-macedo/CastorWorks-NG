#!/usr/bin/env node
/**
 * Phase 1 E2E: Super admin panel at /admin/tenants.
 * Requires a test user with super_admin role (e.g. ACCOUNT_TEST_EMAIL or ACCOUNT_SUPER_ADMIN_EMAIL).
 *
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- phase1-admin-tenants
 * Or: bash scripts/agent-browser-e2e.sh phase1-admin-tenants
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase1-admin-tenants-${Date.now()}`
const outDir = 'test-results/phase1-admin-tenants'

const readEnv = (key) => {
  const file = fs.existsSync('.env.testing') ? '.env.testing' : '.env'
  if (!fs.existsSync(file)) return process.env[key]
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${key}=`))
  if (!line) return process.env[key]
  return line.replace(/^[^=]+=/, '').replace(/^"|"$/g, '').trim()
}

const email = process.env.ACCOUNT_SUPER_ADMIN_EMAIL || process.env.ACCOUNT_TEST_EMAIL || readEnv('ACCOUNT_SUPER_ADMIN_EMAIL') || readEnv('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_SUPER_ADMIN_PASSWORD || process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnv('ACCOUNT_SUPER_ADMIN_PASSWORD') || readEnv('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_SUPER_ADMIN_EMAIL and password in .env.testing or env')
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
  run(['wait', '4000'])

  run(['open', `${baseUrl}/admin/tenants`])
  run(['wait', '3000'])
  run(['screenshot', `${outDir}/01-admin-tenants.png`, '--full'])

  const bodyText = (run(['get', 'text', 'body'], { returnOutput: true }) || '').toLowerCase()
  const hasTenantsTitle =
    bodyText.includes('tenants') ||
    bodyText.includes('tenant') ||
    bodyText.includes('workspace')
  const hasTableOrList = bodyText.includes('slug') || bodyText.includes('status') || bodyText.includes('name')

  if (!hasTenantsTitle && !hasTableOrList) {
    if (bodyText.includes('access denied') || bodyText.includes('forbidden') || bodyText.includes('403')) {
      throw new Error('Super admin panel returned access denied. Ensure test user has super_admin role in user_roles.')
    }
    throw new Error('Admin tenants page did not show expected title or table (Tenants / Name / Slug / Status)')
  }

  console.log('✅ Phase 1 admin-tenants E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 1 admin-tenants E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
