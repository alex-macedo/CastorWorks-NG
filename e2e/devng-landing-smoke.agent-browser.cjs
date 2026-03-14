#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'https://devng.castorworks.cloud'
const session = `e2e-devng-landing-${Date.now()}`
const outDir = 'test-results/devng-landing'

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

try {
  run(['open', `${baseUrl}/`])
  run(['wait', '2000'])
  run(['screenshot', `${outDir}/01-landing-home.png`, '--full'])

  const clickLabels = [
    'Sign In',
    'Entrar',
    'Iniciar sessão',
    'Iniciar sesion',
    'Se connecter',
  ]

  let clicked = false
  for (const label of clickLabels) {
    if (run(['click', `text=${label}`], { allowFail: true })) {
      clicked = true
      break
    }
  }

  if (!clicked) {
    throw new Error('Could not find a landing sign-in CTA')
  }

  run(['wait', '2000'])
  run(['screenshot', `${outDir}/02-login-redirect.png`, '--full'])

  const currentUrl = run(['get', 'url'], { returnOutput: true })
  if (!currentUrl.includes('/login')) {
    throw new Error(`Expected redirect to /login, got ${currentUrl}`)
  }

  console.log('✅ DevNG landing smoke test passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (error) {
  console.error('❌ DevNG landing smoke test failed:', error.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
