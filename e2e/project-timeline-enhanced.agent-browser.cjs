#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const session = `e2e-project-timeline-${Date.now()}`
const outDir = 'test-results/timeline-enhanced'

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
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD')
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

const assertElementExists = (selector, label) => {
  run([
    'eval',
    `if (!document.querySelector(${JSON.stringify(selector)})) { throw new Error(${JSON.stringify(
      `${label} not found`
    )}); }`,
  ])
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  run(['open', `${baseUrl}/projects-timeline`])
  run(['wait', '4000'])
  run(['screenshot', `${outDir}/01-timeline-page.png`, '--full'])

  assertElementExists('[data-testid="timeline-search"]', 'timeline search input')
  assertElementExists('[data-testid="project-timeline-canvas"]', 'timeline canvas')
  assertElementExists('[data-testid="deadlines-panel"]', 'deadlines panel')

  run(['fill', '[data-testid="timeline-search"]', 'project'])
  run(['wait', '1200'])
  run(['screenshot', `${outDir}/02-search-filter.png`, '--full'])

  run(
    [
      'eval',
      `
      const row = document.querySelector('[data-testid^="deadline-row-"]')
      if (row) row.click()
      `,
    ],
    { allowFail: true }
  )
  run(
    [
      'eval',
      `
      const marker = document.querySelector('[data-testid^="deadline-milestone-"]')
      if (marker) marker.click()
      `,
    ],
    { allowFail: true }
  )
  run(['wait', '1000'])
  run(['screenshot', `${outDir}/03-milestone-selection.png`, '--full'])

  run(
    [
      'eval',
      `
      const recalcButton = document.querySelector('[data-testid="timeline-recalculate-forecast"]')
      if (recalcButton && !recalcButton.disabled) recalcButton.click()
      `,
    ],
    { allowFail: true }
  )
  run(['wait', '3000'])
  run(['screenshot', `${outDir}/04-after-recalculation.png`, '--full'])

  console.log('✅ Timeline enhanced e2e completed')
} catch (error) {
  console.error(`❌ Timeline enhanced e2e failed: ${error.message}`)
  process.exit(1)
}
