#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-castormind-ai-response-language-${Date.now()}`
const outDir = 'test-results/castormind-ai-response-language'

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

const detectLocale = (bodyText) => {
  const text = bodyText.toLowerCase()

  if (text.includes('como posso ajudar você hoje?')) return 'pt-BR'
  if (text.includes('¿cómo puedo ayudarte hoy?')) return 'es-ES'
  if (text.includes('comment puis-je vous aider aujourd’hui')) return 'fr-FR'
  return 'en-US'
}

const expectedReplyMarkers = {
  'en-US': 'I can help with these operations:',
  'pt-BR': 'Posso ajudar com estas operações:',
  'es-ES': 'Puedo ayudarte con estas operaciones:',
  'fr-FR': 'Je peux vous aider avec ces opérations',
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  run(['open', `${baseUrl}/castormind-ai`])
  run(['wait', '2500'])

  const initialBody = run(['get', 'text', 'body'], { returnOutput: true })
  const locale = detectLocale(initialBody)

  run(['fill', '[data-testid="superbot-input"]', 'help'])
  if (!run(['click', '[data-testid="superbot-send"]'], { allowFail: true })) {
    run(['press', 'Enter'])
  }

  run(['wait', '4000'])
  run(['screenshot', `${outDir}/01-response-language.png`, '--full'], { allowFail: true })

  const responseBody = run(['get', 'text', 'body'], { returnOutput: true })
  const expectedMarker = expectedReplyMarkers[locale]

  if (!responseBody.includes(expectedMarker)) {
    throw new Error(`Expected response marker "${expectedMarker}" for locale ${locale}`)
  }

  console.log(`✅ CastorMind-AI response language verified for ${locale}`)
} catch (error) {
  console.error(`❌ CastorMind-AI response language test failed: ${error.message}`)
  process.exit(1)
}
