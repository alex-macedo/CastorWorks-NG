#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const session = `e2e-castormind-darkmode-${Date.now()}`
const outDir = 'test-results/castormind-darkmode'

const readEnvValueFromFile = (filePath, key) => {
  if (!fs.existsSync(filePath)) return undefined
  const line = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${key}=`))
  if (!line) return undefined
  return line.replace(`${key}=`, '').replace(/^"|"$/g, '')
}

const readEnvValue = (key) =>
  readEnvValueFromFile('.env.testing', key) || readEnvValueFromFile('.env', key)

const email = process.env.ACCOUNT_TEST_EMAIL || readEnvValue('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnvValue('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment or .env.testing')
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
    const stderr = result.stderr ? result.stderr.trim() : ''
    throw new Error(`agent-browser failed: ${stderr}`)
  }

  if (returnOutput) return (result.stdout || '').trim()
  return true
}

const loginLikelyFailed = () => {
  const text = run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()
  return text.includes('welcome back') || text.includes('sign in')
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  if (loginLikelyFailed()) {
    throw new Error('Login failed for dark-mode verification')
  }

  run(['open', `${baseUrl}/castormind-ai`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/01-light.png`, '--full'])

  if (!run(['click', 'button:has(svg[data-lucide="moon"])'], { allowFail: true })) {
    run(['click', 'button:has(svg[data-lucide="sun"])'], { allowFail: true })
  }

  run(['wait', '1200'])
  run(['screenshot', `${outDir}/02-dark.png`, '--full'])

  run(['fill', 'input[placeholder*="CastorMind-AI"]', 'Show me all quotes where vendors did not return a proposal.'])
  if (!run(['click', '[data-testid="superbot-send"]'], { allowFail: true })) {
    run(['key', 'Enter'])
  }

  run(['wait', '4500'])
  run(['screenshot', `${outDir}/03-dark-after-message.png`, '--full'])

  console.log('✅ CastorMind dark-mode verification completed')
} catch (error) {
  console.error(`❌ CastorMind dark-mode verification failed: ${error.message}`)
  process.exit(1)
}
