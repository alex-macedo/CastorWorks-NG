#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-castormind-ai-localization-${Date.now()}`
const outDir = 'test-results/castormind-ai-localization'

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

const clickFirst = (selectors) => {
  for (const selector of selectors) {
    if (run(['click', selector], { allowFail: true })) return selector
  }
  return null
}

const expectationsByLocale = {
  'pt-BR': {
    button: 'Análises',
    labels: [
      'Visão de Projetos Atrasados',
      'Resumo de Pagamentos em Aberto',
      'Fechar Tarefas até Hoje',
      'Fornecedores sem Proposta',
    ],
    markers: ['Como posso ajudar você hoje?', 'Buscar conversas...', 'Pergunte ao CastorMind-AI...'],
  },
  'en-US': {
    button: 'Analytics',
    labels: [
      'Delayed Projects Overview',
      'Due Payments Snapshot',
      'Close Tasks Until Today',
      'Vendors Missing Proposals',
    ],
    markers: ['How Can I Assist You Today?', 'Search chats...', 'Ask CastorMind-AI...'],
  },
  'es-ES': {
    button: 'Analíticas',
    labels: [
      'Resumen de Proyectos Retrasados',
      'Resumen de Pagos Pendientes',
      'Cerrar Tareas Hasta Hoy',
      'Proveedores sin Propuesta',
    ],
    markers: ['¿Cómo puedo ayudarte hoy?', 'Buscar chats...', 'Pregúntale a CastorMind-AI...'],
  },
  'fr-FR': {
    button: 'Analyses',
    labels: [
      'Vue des Projets en Retard',
      'Résumé des Paiements Dus',
      'Clore les Tâches Jusqu’à Aujourd’hui',
      'Fournisseurs sans Proposition',
    ],
    markers: ['Comment puis-je vous aider aujourd’hui ?', 'Rechercher des conversations...'],
  },
}

const detectLocale = (bodyText) => {
  const normalized = bodyText.toLowerCase()
  for (const [locale, config] of Object.entries(expectationsByLocale)) {
    if (config.markers.some(marker => normalized.includes(marker.toLowerCase()))) {
      return locale
    }
  }

  return 'en-US'
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  run(['open', `${baseUrl}/castormind-ai`])
  run(['wait', '3000'])
  run(['screenshot', `${outDir}/01-castormind-ai.png`, '--full'], { allowFail: true })

  const bodyText = run(['get', 'text', 'body'], { returnOutput: true })
  const locale = detectLocale(bodyText)
  const expected = expectationsByLocale[locale]

  if (!bodyText.includes(expected.button)) {
    throw new Error(`Expected localized analytics button "${expected.button}" for locale ${locale}`)
  }

  const hasVisibleTemplateLabels = Object.values(expectationsByLocale)
    .flatMap(config => config.labels)
    .some(label => bodyText.includes(label))

  if (hasVisibleTemplateLabels) {
    for (const label of expected.labels) {
      if (!bodyText.includes(label)) {
        throw new Error(`Expected localized template label "${label}" for locale ${locale}`)
      }
    }
  }

  const buttonSelector = clickFirst([
    `text=${expected.button}`,
    'text=Analytics',
    'text=Análises',
    'text=Analíticas',
    'text=Analyses',
  ])

  if (!buttonSelector) {
    throw new Error('Could not click the analytics button')
  }

  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-castormind-ai-analytics.png`, '--full'], { allowFail: true })

  const analyticsText = run(['get', 'text', 'body'], { returnOutput: true })
  if (!analyticsText.includes('CastorMind-AI Analytics')) {
    throw new Error('Analytics page did not load after clicking the button')
  }

  console.log(`✅ CastorMind-AI localization verified for ${locale}`)
} catch (error) {
  console.error(`❌ CastorMind-AI localization test failed: ${error.message}`)
  process.exit(1)
}
