#!/usr/bin/env node
/**
 * Phase 3 E2E: Trial Experience — login, load app, verify dashboard and optional trial banner.
 * If the test tenant is on trial, the trial countdown banner should be visible.
 * Run: npm run test:e2e -- phase3-trial-experience (uses BASE_URL=5181 for NG)
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-phase3-trial-${Date.now()}`
const outDir = 'test-results/phase3-trial-experience'

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
  run(['screenshot', `${outDir}/01-dashboard.png`, '--full'])

  const bodyText = (run(['get', 'text', 'body'], { returnOutput: true }) || '').toLowerCase()
  const hasApp =
    bodyText.includes('dashboard') ||
    bodyText.includes('projects') ||
    bodyText.includes('projetos') ||
    bodyText.includes('settings') ||
    bodyText.includes('configura') ||
    bodyText.includes('workspace') ||
    bodyText.includes('platform')
  if (!hasApp) {
    throw new Error('Dashboard did not load (expected app labels). Body length: ' + bodyText.length)
  }

  // If tenant is on trial, banner should show "days left" (en) or "dias restantes" (pt) etc.
  const hasTrialBanner =
    bodyText.includes('days left') ||
    bodyText.includes('dias restantes') ||
    bodyText.includes('días restantes') ||
    bodyText.includes('jours restants') ||
    bodyText.includes('day left') ||
    bodyText.includes('dia restante')
  if (hasTrialBanner) {
    console.log('✅ Trial countdown banner visible (tenant on trial)')
  } else {
    console.log('ℹ️  Trial banner not shown (tenant may be sandbox or paid — app loaded OK)')
  }

  console.log('✅ Phase 3 trial-experience E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Phase 3 trial-experience E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
