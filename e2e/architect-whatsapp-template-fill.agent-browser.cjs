#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const envFile = '.env.testing'

const readEnvValue = (key) => {
  if (!fs.existsSync(envFile)) {
    return undefined
  }
  const line = fs
    .readFileSync(envFile, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${key}=`))
  if (!line) return undefined
  return line.replace(`${key}=`, '').replace(/^\"|\"$/g, '')
}

const email = process.env.ACCOUNT_TEST_EMAIL || readEnvValue('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnvValue('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment or .env.testing')
  process.exit(1)
}

const session = 'e2e-architect-whatsapp-template'
const outDir = 'test-results'
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const runAgentBrowser = (args) => {
  const result = spawnSync('agent-browser', ['--session', session, ...args], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.trim() : ''
    throw new Error(`agent-browser failed: ${stderr}`)
  }

  return (result.stdout || '').trim()
}

const clickFirstTextMatch = (labels) => {
  for (const label of labels) {
    try {
      runAgentBrowser(['click', `text=${label}`])
      return true
    } catch (error) {
      // Try next label
    }
  }
  return false
}

const run = async () => {
  try {
    runAgentBrowser(['open', `${baseUrl}/login`])
    runAgentBrowser(['fill', '#email', email])
    runAgentBrowser(['fill', '#password', password])
    runAgentBrowser(['click', 'button[type=submit]'])
    runAgentBrowser(['wait', '3000'])

    runAgentBrowser(['open', `${baseUrl}/architect/whatsapp`])
    runAgentBrowser(['wait', '2000'])
    const currentUrl = runAgentBrowser(['get', 'url'])
    console.log(`Current URL: ${currentUrl}`)

    runAgentBrowser(['screenshot', `${outDir}/architect-whatsapp-page.png`, '--full'])

    let templateClicked = false
    try {
      runAgentBrowser(['click', '[data-testid="whatsapp-template-milestone_reached"]'])
      templateClicked = true
    } catch (error) {
      const tabClicked = clickFirstTextMatch(['Templates', 'Modelos', 'Modèles', 'Plantillas'])
      if (!tabClicked) {
        throw new Error('Templates tab not found')
      }
      runAgentBrowser(['click', '[data-testid="whatsapp-template-milestone_reached"]'])
      templateClicked = true
    }

    if (!templateClicked) {
      throw new Error('Template card not found')
    }
    runAgentBrowser(['wait', '800'])

    const messageValue = runAgentBrowser(['get', 'value', 'textarea#message'])
    if (!messageValue || messageValue.trim().length === 0) {
      throw new Error('Template message was not populated')
    }

    if (messageValue.includes('architect.whatsapp.templates')) {
      throw new Error('Template message contains i18n key instead of resolved text')
    }

    runAgentBrowser(['screenshot', `${outDir}/architect-whatsapp-template-filled.png`, '--full'])
    console.log('✅ Architect WhatsApp template fill verified')
  } catch (error) {
    console.error(`❌ Architect WhatsApp template fill failed: ${error.message}`)
    process.exit(1)
  }
}

run()
