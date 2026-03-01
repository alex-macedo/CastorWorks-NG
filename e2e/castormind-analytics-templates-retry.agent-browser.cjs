#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const session = `e2e-castormind-analytics-templates-retry-${Date.now()}`
const outDir = 'test-results/castormind-analytics'

const readEnv = (file, key) => {
  if (!fs.existsSync(file)) return undefined
  const line = fs.readFileSync(file, 'utf8').split('\n').find(l => l.startsWith(`${key}=`))
  return line ? line.replace(`${key}=`, '').replace(/^"|"$/g, '') : undefined
}

const email = process.env.ACCOUNT_TEST_EMAIL || readEnv('.env.testing', 'ACCOUNT_TEST_EMAIL') || readEnv('.env', 'ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnv('.env.testing', 'ACCOUNT_TEST_EMAIL_PASSWORD') || readEnv('.env', 'ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const run = (args, allowFail = false, returnOutput = false) => {
  const res = spawnSync('agent-browser', ['--session', session, ...args], { encoding: 'utf8' })
  if (res.status !== 0) {
    if (allowFail) return false
    throw new Error(res.stderr || 'agent-browser command failed')
  }
  return returnOutput ? (res.stdout || '').trim() : true
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3000'])

  run(['open', `${baseUrl}/castormind-ai`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/01-castormind-chat.png`, '--full'])

  run(['click', 'text=Analytics'])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-castormind-analytics.png`, '--full'])

  const text = run(['get', 'text', 'body'], false, true)
  if (!text.includes('CastorMind-AI Analytics')) {
    throw new Error('Analytics page not loaded')
  }

  console.log('✅ CastorMind analytics/templates smoke test completed')
} catch (error) {
  console.error(`❌ CastorMind analytics/templates smoke test failed: ${error.message}`)
  process.exit(1)
}
