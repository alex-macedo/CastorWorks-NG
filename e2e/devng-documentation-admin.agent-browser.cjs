#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'https://devng.castorworks.cloud'
const envTesting = fs.readFileSync('.env.testing', 'utf8')
const email = (envTesting.match(/^ACCOUNT_TEST_EMAIL=(.*)$/m) || [])[1]
const password = (envTesting.match(/^ACCOUNT_TEST_EMAIL_PASSWORD=(.*)$/m) || [])[1]

if (!email || !password) {
  throw new Error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing')
}

const session = `e2e-devng-documentation-admin-${Date.now()}`
const outDir = 'test-results/devng-documentation-admin'

fs.mkdirSync(outDir, { recursive: true })

const run = (args, { allowFail = false, returnOutput = false } = {}) => {
  const result = spawnSync('agent-browser', ['--session', session, ...args], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0) {
    if (allowFail) return ''
    throw new Error(result.stderr ? result.stderr.trim() : 'agent-browser failed')
  }

  return returnOutput ? (result.stdout || '').trim() : true
}

const evalJson = (script) => {
  const raw = run(['eval', script], { returnOutput: true })
  const parsed = JSON.parse(raw)
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
}

try {
  run(['set', 'viewport', '1600', '1200'])
  run(['open', `${baseUrl}/login`])
  run(['wait', '2500'])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '5000'])

  run(['open', `${baseUrl}/documentation`])
  run(['wait', '3000'])
  run(['screenshot', `${outDir}/01-documentation-admin.png`, '--full'])

  const documentationState = evalJson(`
    (() => JSON.stringify({
      path: window.location.pathname,
      text: document.body.innerText
    }))()
  `)

  const requiredLabels = [
    'Powered by AI',
    'Technical',
    'Tests',
    'Architecture',
    'Implementation Info',
  ]

  for (const label of requiredLabels) {
    if (!documentationState.text.includes(label)) {
      throw new Error(`Missing admin-only documentation section: ${label}`)
    }
  }

  run([
    'open',
    `${baseUrl}/documentation/viewer?path=${encodeURIComponent('/docs/ROADMAP_IMPLEMENTATION.md')}&name=${encodeURIComponent('Roadmap Implementation')}`,
  ])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-documentation-viewer-admin.png`, '--full'])

  const viewerState = evalJson(`
    (() => JSON.stringify({
      path: window.location.pathname,
      text: document.body.innerText
    }))()
  `)

  if (!/Roadmap Implementation|Implementation Info/i.test(viewerState.text)) {
    throw new Error('Admin could not open a restricted documentation page')
  }

  console.log('✅ DevNG documentation admin smoke test passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (error) {
  console.error('❌ DevNG documentation admin smoke test failed:', error.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
