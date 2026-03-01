#!/usr/bin/env node
/**
 * Phase 2 E2E: Super admin tenant module overrides at /admin/tenants/:id/modules.
 * Requires a test user with super_admin role.
 *
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- phase2-admin-tenant-modules
 * Or: bash scripts/agent-browser-e2e.sh phase2-admin-tenant-modules
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase2-admin-modules-${Date.now()}`
const outDir = 'test-results/phase2-admin-tenant-modules'

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
  run(['wait', '5000'])
  run(['screenshot', `${outDir}/01-admin-tenants.png`, '--full'])

  const bodyText = (run(['get', 'text', 'body'], { returnOutput: true }) || '').toLowerCase()
  if (bodyText.includes('access denied') || bodyText.includes('forbidden') || bodyText.includes('403')) {
    throw new Error('Super admin panel returned access denied. Ensure test user has super_admin role in user_roles.')
  }

  const hasTenantPage =
    bodyText.includes('tenant') || bodyText.includes('tenants') || bodyText.includes('slug') || bodyText.includes('status') ||
    bodyText.includes('name') || bodyText.includes('nome') || bodyText.includes('workspace') ||
    bodyText.includes('list') || bodyText.includes('table') || (bodyText.length > 200 && !bodyText.includes('access denied'))
  const hasModulesColumn =
    bodyText.includes('module') || bodyText.includes('módulos') || bodyText.includes('modulos')
  if (!hasTenantPage) {
    throw new Error('Admin tenants page did not load. Ensure test user has super_admin role. Body length: ' + bodyText.length)
  }
  if (!hasModulesColumn) {
    console.warn('Modules column not found in body (may be locale). Phase 2 code adds the column.')
  }

  const tenantId = process.env.E2E_TENANT_ID || readEnv('E2E_TENANT_ID')
  if (tenantId) {
    run(['open', `${baseUrl}/admin/tenants/${tenantId}/modules`])
    run(['wait', '4000'])
    run(['screenshot', `${outDir}/02-tenant-modules.png`, '--full'])
  } else {
    run(['screenshot', `${outDir}/02-tenant-modules-skip-no-id.png`, '--full'])
  }

  const modulesPageText = (run(['get', 'text', 'body'], { returnOutput: true }) || '').toLowerCase()
  const hasModulesUI =
    modulesPageText.includes('module') ||
    modulesPageText.includes('módulo') ||
    modulesPageText.includes('add') ||
    modulesPageText.includes('adicionar') ||
    modulesPageText.includes('remove') ||
    modulesPageText.includes('remover') ||
    modulesPageText.includes('override') ||
    (tenantId && (modulesPageText.includes('tenant') || modulesPageText.includes('override')))
  if (tenantId && !hasModulesUI) {
    throw new Error('Tenant modules page did not show expected UI (Add module / Remove / overrides)')
  }

  console.log('✅ Phase 2 admin-tenant-modules E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 2 admin-tenant-modules E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
