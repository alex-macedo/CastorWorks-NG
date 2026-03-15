#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-financial-cashflow-forecast-${Date.now()}`
const outDir = 'test-results/financial-cashflow-forecast'

const readEnv = (file, key) => {
  if (!fs.existsSync(file)) return undefined
  const line = fs.readFileSync(file, 'utf8').split('\n').find(entry => entry.startsWith(`${key}=`))
  return line ? line.replace(`${key}=`, '').replace(/^"|"$/g, '') : undefined
}

const email =
  process.env.ACCOUNT_TEST_EMAIL ||
  readEnv('.env.testing', 'ACCOUNT_TEST_EMAIL') ||
  readEnv('.env', 'ACCOUNT_TEST_EMAIL')
const password =
  process.env.ACCOUNT_TEST_EMAIL_PASSWORD ||
  readEnv('.env.testing', 'ACCOUNT_TEST_EMAIL_PASSWORD') ||
  readEnv('.env', 'ACCOUNT_TEST_EMAIL_PASSWORD')

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
    throw new Error((result.stderr || result.stdout || 'agent-browser command failed').trim())
  }

  return returnOutput ? (result.stdout || '').trim() : true
}

const clickAny = (selectors) => {
  for (const selector of selectors) {
    if (run(['click', selector], { allowFail: true })) return true
  }
  return false
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  if (run(['find', '#email'], { allowFail: true })) {
    throw new Error('Login failed while validating cashflow forecast page')
  }

  run(['open', `${baseUrl}/finance/cashflow`])
  run(['wait', '3500'])
  run(['screenshot', `${outDir}/01-cashflow-page.png`, '--full'], { allowFail: true })

  let initialText = run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()
  let hasPageStructure =
    (initialText.includes('cashflow command center') || initialText.includes('centro de comando')) &&
    (initialText.includes('13-week forecast') || initialText.includes('previsão') || initialText.includes('forecast')) &&
    (initialText.includes('risk windows') || initialText.includes('janelas de risco') || initialText.includes('risco'))

  if (!hasPageStructure) {
    run(['wait', '2500'])
    initialText = run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()
    hasPageStructure =
      (initialText.includes('cashflow command center') || initialText.includes('centro de comando')) &&
      (initialText.includes('13-week forecast') || initialText.includes('previsão') || initialText.includes('forecast')) &&
      (initialText.includes('risk windows') || initialText.includes('janelas de risco') || initialText.includes('risco'))
  }

  if (!hasPageStructure) {
    throw new Error('Could not confirm expected cashflow command center structure in page content')
  }

  const refreshed = clickAny([
    'text=Refresh',
    'text=Atualizar',
    'text=Actualizar',
    'text=Rafraîchir',
  ])
  if (!refreshed) {
    throw new Error('Could not trigger refresh action on cashflow page')
  }

  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-cashflow-after-refresh.png`, '--full'], { allowFail: true })

  const pageText = run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()
  const hasPostRefreshStructure =
    (pageText.includes('13-week forecast') || pageText.includes('previsão') || pageText.includes('forecast')) &&
    (pageText.includes('risk windows') || pageText.includes('risco') || pageText.includes('risk'))

  if (!hasPostRefreshStructure) {
    throw new Error('Could not confirm forecast/risk sections after refresh')
  }

  console.log('✅ Financial cashflow forecast E2E verification passed')
  console.log(`📸 Evidence saved in ${outDir}`)
} catch (error) {
  console.error(`❌ Financial cashflow forecast E2E verification failed: ${error.message}`)
  process.exit(1)
}
