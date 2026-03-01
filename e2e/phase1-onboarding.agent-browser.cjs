#!/usr/bin/env node
/**
 * Phase 1 E2E: Onboarding flow (no tenants → create workspace → redirect to app).
 * Requires a test user with NO tenants (e.g. ACCOUNT_ONBOARDING_EMAIL in .env.testing).
 * If not set, uses ACCOUNT_TEST_EMAIL (may land on / or /tenant-picker if already in a tenant).
 *
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- phase1-onboarding
 * Or: bash scripts/agent-browser-e2e.sh phase1-onboarding
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase1-onboarding-${Date.now()}`
const outDir = 'test-results/phase1-onboarding'

const readEnv = (key) => {
  const file = fs.existsSync('.env.testing') ? '.env.testing' : '.env'
  if (!fs.existsSync(file)) return process.env[key]
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${key}=`))
  if (!line) return process.env[key]
  return line.replace(/^[^=]+=/, '').replace(/^"|"$/g, '').trim()
}

const email = process.env.ACCOUNT_ONBOARDING_EMAIL || process.env.ACCOUNT_TEST_EMAIL || readEnv('ACCOUNT_ONBOARDING_EMAIL') || readEnv('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_ONBOARDING_PASSWORD || process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnv('ACCOUNT_ONBOARDING_PASSWORD') || readEnv('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL/ACCOUNT_ONBOARDING_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD/ACCOUNT_ONBOARDING_PASSWORD in .env.testing or env')
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

const clickSubmit = () => {
  const labels = ['Create workspace', 'Criar workspace', 'Crear espacio', 'Créer l’espace', 'Creating...', 'Criando...']
  for (const label of labels) {
    if (run(['click', `text=${label}`], { allowFail: true })) return true
  }
  return run(['click', 'button[type=submit]'], { allowFail: true })
}

try {
  run(['open', `${baseUrl}/login`])
  run(['wait', '2000'])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '4000'])

  const url = run(['get', 'url'], { returnOutput: true })
  run(['screenshot', `${outDir}/01-after-login.png`, '--full'])

  if (url.includes('/onboarding')) {
    run(['fill', '#onboarding-name', `E2E Workspace ${Date.now()}`])
    run(['wait', '500'])
    run(['screenshot', `${outDir}/02-onboarding-filled.png`, '--full'])
    if (!clickSubmit()) {
      throw new Error('Could not click onboarding submit button')
    }
    run(['wait', '5000'])
  }

  const finalUrl = run(['get', 'url'], { returnOutput: true })
  run(['screenshot', `${outDir}/03-after-onboarding.png`, '--full'])

  if (finalUrl.includes('/onboarding')) {
    throw new Error('Still on /onboarding after submit; expected redirect to /')
  }
  if (finalUrl.includes('/login')) {
    throw new Error('Redirected back to login; check credentials or RLS')
  }

  console.log('✅ Phase 1 onboarding E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 1 onboarding E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
