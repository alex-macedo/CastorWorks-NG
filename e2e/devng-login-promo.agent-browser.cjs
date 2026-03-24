#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'https://devng.castorworks.cloud'
const session = `e2e-devng-login-promo-${Date.now()}`
const outDir = 'test-results/devng-login-promo'

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

const tryClickButton = (labels) => {
  for (const label of labels) {
    const script = `
      (() => {
        const button = Array.from(document.querySelectorAll('button')).find((item) =>
          (item.textContent || '').includes(${JSON.stringify(label)})
        )
        if (!button) throw new Error('button not found')
        button.click()
        return true
      })()
    `

    if (run(['eval', script], { allowFail: true })) {
      return true
    }
  }

  return false
}

try {
  run(['set', 'viewport', '1600', '1100'])
  run(['open', `${baseUrl}/login`])
  run(['wait', '3500'])
  run(['screenshot', `${outDir}/01-login-page.png`, '--full'])

  const pageText = run(['get', 'text', 'body'], { returnOutput: true })
  if (!pageText.match(/Bem-vindo de Volta|Digite suas credenciais para acessar seu painel/)) {
    throw new Error('Login page did not default to Brazilian Portuguese')
  }

  if (!pageText.match(/Entrar na Lista|Idioma/)) {
    throw new Error('Login promo CTA or language switcher was not rendered')
  }

  if (!tryClickButton(['Entrar na Lista', 'Join the List'])) {
    throw new Error('Could not open the waitlist modal from the login page')
  }

  run(['wait', '1200'])
  run(['screenshot', `${outDir}/02-login-waitlist-modal.png`, '--full'])

  const dialogText = run(['get', 'text', 'body'], { returnOutput: true })
  if (!dialogText.match(/Entre na lista de espera da CastorWorks|Join the CastorWorks waiting list/)) {
    throw new Error('Waitlist modal content did not render from the login page')
  }

  console.log('✅ DevNG login promo smoke test passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (error) {
  console.error('❌ DevNG login promo smoke test failed:', error.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
