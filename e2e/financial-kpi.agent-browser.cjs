#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const session = `e2e-financial-kpi-${Date.now()}`
const outDir = 'test-results/financial-kpi'

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
  readEnvValueFromFile('.env', key) || readEnvValueFromFile('.env.testing', key)

const email = process.env.ACCOUNT_TEST_EMAIL || readEnvValue('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnvValue('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment/.env.testing')
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

const runAny = (commands) => {
  for (const args of commands) {
    if (run(args, { allowFail: true })) return true
  }
  return false
}

const getBodyText = () => run(['get', 'text', 'body'], { returnOutput: true }).toLowerCase()

const loginIfNeeded = () => {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])
  run(['open', `${baseUrl}/financial`])
  run(['wait', '2500'])
  const stillOnLogin = run(['find', '#email'], { allowFail: true })
  if (stillOnLogin) {
    throw new Error('Login failed while validating financial KPI page')
  }
}

const assertFinancialKpisVisible = () => {
  const countOutput = run(
    [
      'eval',
      "console.log(document.querySelectorAll('button:has(svg[data-lucide=\"circle-help\"])').length)",
    ],
    { returnOutput: true }
  )

  const countMatch = (countOutput || '').match(/(\d+)\s*$/)
  const defCount = countMatch ? Number(countMatch[1]) : 0

  if (defCount < 8) {
    throw new Error(`Could not confirm full KPI card set. Definition buttons found: ${defCount}`)
  }
}

const assertKpiTooltipDefsVisible = () => {
  const opened = runAny([
    ['click', 'button:has(svg[data-lucide="circle-help"])'],
  ])

  if (!opened) {
    throw new Error('Could not open KPI definition tooltip')
  }

  run(['wait', '600'])
  const body = getBodyText()
  const hasFormula =
    body.includes('formula:') ||
    body.includes('fórmula:') ||
    body.includes('formule:') ||
    body.includes('financial:kpi.tooltip.formula')
  const hasPeriod = body.includes('period:') || body.includes('período:') || body.includes('période:')
  const hasSource =
    body.includes('data source:') ||
    body.includes('fonte de dados:') ||
    body.includes('fuente de datos:') ||
    body.includes('source de données:') ||
    body.includes('financial:kpi.tooltip.source')

  if (!hasFormula || !hasPeriod || !hasSource) {
    throw new Error('Tooltip definition content not detected (formula/period/source)')
  }
}

const assertPeriodFilterWorks = () => {
  const opened = runAny([
    ['click', '[role="combobox"]'],
    ['find', 'role', 'combobox', 'click'],
  ])
  if (!opened) {
    throw new Error('Could not open period filter')
  }

  const selected = runAny([
    ['click', 'text=Last 30 Days'],
    ['click', 'text=Últimos 30 dias'],
    ['click', 'text=Últimos 30 días'],
    ['click', 'text=30 derniers jours'],
  ])
  if (!selected) {
    throw new Error('Could not select 30-day period option')
  }
}

try {
  loginIfNeeded()
  run(['open', `${baseUrl}/financial`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/01-financial-page.png`, '--full'])

  assertFinancialKpisVisible()
  assertPeriodFilterWorks()
  run(['wait', '1000'])
  run(['screenshot', `${outDir}/02-period-filter-applied.png`, '--full'])

  assertKpiTooltipDefsVisible()
  run(['screenshot', `${outDir}/03-kpi-tooltip-definition.png`, '--full'])

  console.log('✅ Financial KPI verification passed')
  console.log(`📸 Evidence saved in ${outDir}`)
} catch (error) {
  console.error(`❌ Financial KPI verification failed: ${error.message}`)
  process.exit(1)
}
