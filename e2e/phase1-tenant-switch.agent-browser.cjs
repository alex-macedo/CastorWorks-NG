#!/usr/bin/env node
/**
 * Phase 1 E2E: Tenant switch (user with 2+ tenants → picker → select tenant → verify app).
 * Requires a test user that belongs to at least 2 tenants (or 1 tenant for partial check).
 *
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- phase1-tenant-switch
 * Or: bash scripts/agent-browser-e2e.sh phase1-tenant-switch
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase1-tenant-switch-${Date.now()}`
const outDir = 'test-results/phase1-tenant-switch'

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
  run(['wait', '4000'])

  let url = run(['get', 'url'], { returnOutput: true })

  if (url.includes('/tenant-picker')) {
    run(['screenshot', `${outDir}/01-tenant-picker.png`, '--full'])
    const buttons = run(
      ['eval', "Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).join('|')"],
      { returnOutput: true }
    )
    if (!buttons || buttons.split('|').length < 2) {
      console.log('⚠️ User has fewer than 2 tenants; verifying picker and first tenant only')
    }
    run(['click', 'button.variant-outline'], { allowFail: true }) || run(['click', 'button'], { allowFail: true })
    run(['wait', '3000'])
  }

  url = run(['get', 'url'], { returnOutput: true })
  if (url.includes('/tenant-picker') || url.includes('/onboarding') || url.includes('/login')) {
    throw new Error('Expected to land on app (/) after tenant selection, got: ' + url)
  }

  run(['open', `${baseUrl}/projects`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-projects-tenant-a.png`, '--full'])

  run(['open', `${baseUrl}/tenant-picker`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/03-tenant-picker-again.png`, '--full'])
  const clickedSecond = run(
    ['eval', "var b = document.querySelectorAll('button'); if (b.length > 1) { b[1].click(); 'second'; } else if (b.length) { b[0].click(); 'first'; } else { 'none'; }"],
    { returnOutput: true }
  )
  run(['wait', '3000'])

  run(['open', `${baseUrl}/projects`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/04-projects-tenant-b.png`, '--full'])

  const finalUrl = run(['get', 'url'], { returnOutput: true })
  if (finalUrl.includes('/login') || finalUrl.includes('/onboarding')) {
    throw new Error('Tenant switch left us on login or onboarding')
  }

  console.log('✅ Phase 1 tenant-switch E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 1 tenant-switch E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
