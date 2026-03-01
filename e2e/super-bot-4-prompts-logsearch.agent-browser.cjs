#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const session = 'e2e-super-bot-4-prompts'
const outDir = 'test-results/super-bot'

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

const prompts = [
  'Show me all projects that are delayed and their tasks.',
  'What clients have due payments?',
  'Update all the tasks in the schedule for project "Edifício Comercial Centro" until today.',
  'Show me all quotes where vendors did not return a proposal.',
]

const loginLikelyFailed = () => {
  const text = run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()
  return (
    text.includes('welcome back') ||
    text.includes('enter your credentials') ||
    text.includes("don't have an account") ||
    text.includes('sign in')
  )
}

const tryLogin = () => {
  const defaultEmail = 'alex.macedo.ca@gmail.com'
  const fallbackPassword = '#yf7w*F2IR8^mdMa'
  const attempts = [
    { email, password },
    { email, password: fallbackPassword },
    { email: defaultEmail, password: fallbackPassword },
  ].filter((item) => item.email && item.password)

  for (const attempt of attempts) {
    run(['open', `${baseUrl}/login`])
    run(['fill', '#email', attempt.email])
    run(['fill', '#password', attempt.password])
    run(['click', 'button[type=submit]'])
    run(['wait', '3500'])
    if (!loginLikelyFailed()) return true
  }

  return false
}

const sendPrompt = (prompt, index) => {
  const inputSelectors = [
    '[data-testid="superbot-input"]',
    'input[placeholder*="CastorMind-AI"]',
    'input[placeholder*="CastorMind"]',
  ]

  let inputFound = false
  for (const sel of inputSelectors) {
    if (run(['fill', sel, prompt], { allowFail: true })) {
      inputFound = true
      break
    }
  }

  if (!inputFound) {
    throw new Error('Could not locate Super Bot input field')
  }

  if (!run(['click', '[data-testid="superbot-send"]'], { allowFail: true })) {
    run(['key', 'Enter'])
  }

  run(['wait', '5000'])
  run(['screenshot', `${outDir}/${String(index + 1).padStart(2, '0')}-prompt.png`, '--full'], { allowFail: true })
}

try {
  if (!tryLogin()) {
    throw new Error('Login failed with ACCOUNT_TEST_EMAIL credentials')
  }

  run(['open', `${baseUrl}/castormind-ai`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/00-superbot-open.png`, '--full'], { allowFail: true })

  prompts.forEach((prompt, idx) => sendPrompt(prompt, idx))

  run(['open', `${baseUrl}/settings?tab=log-search`])
  run(['wait', '3000'])

  if (
    !run(
      ['fill', 'input[placeholder="Search messages..."]', 'Super Bot request completed'],
      { allowFail: true },
    )
  ) {
    run(['fill', 'input[placeholder*="Search"]', 'Super Bot request completed'])
  }

  run(['wait', '2500'])
  run(['screenshot', `${outDir}/05-logsearch-filtered.png`, '--full'])

  const pageText = run(['get', 'text', 'body'], { returnOutput: true })
  if (pageText.includes('No logs found')) {
    throw new Error('Log Search returned no logs for Super Bot request completed')
  }

  console.log('✅ Super Bot prompts and Log Search verification completed')
} catch (error) {
  console.error(`❌ Super Bot E2E failed: ${error.message}`)
  process.exit(1)
}
