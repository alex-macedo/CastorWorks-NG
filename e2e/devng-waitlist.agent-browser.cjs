#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'https://devng.castorworks.cloud'
const session = `e2e-devng-waitlist-${Date.now()}`
const outDir = 'test-results/devng-waitlist'
const email = `waitlist+${Date.now()}@castorworks.test`

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
  run(['open', `${baseUrl}/`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/01-landing-home.png`, '--full'])

  const waitlistCtas = [
    'Entrar na Lista de Espera',
    'Join the Waitlist',
  ]

  if (!tryClickButton(waitlistCtas)) {
    throw new Error('Could not find a waitlist CTA on the landing page')
  }

  run(['wait', '1200'])
  run(['screenshot', `${outDir}/02-waitlist-modal.png`, '--full'])

  run([
    'eval',
    `
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        const textarea = document.querySelector('textarea')
        const values = ['Maria Silva', 'Construtora Horizonte', ${JSON.stringify(email)}, '+55 11 99999-9999']
        const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set

        inputs.slice(0, 4).forEach((input, index) => {
          input.focus()
          inputSetter.call(input, values[index])
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        })

        if (textarea) {
          textarea.focus()
          textareaSetter.call(textarea, 'Quero entender onboarding, cronograma e controle financeiro.')
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          textarea.dispatchEvent(new Event('change', { bubbles: true }))
        }

        return {
          inputCount: inputs.length,
          hasTextarea: Boolean(textarea),
        }
      })()
    `,
  ])

  run(['screenshot', `${outDir}/03-waitlist-filled.png`, '--full'])

  if (!tryClickButton(['Entrar na lista', 'Join the list'])) {
    throw new Error('Could not submit the waitlist form')
  }

  run(['wait', '3500'])
  run(['screenshot', `${outDir}/04-waitlist-success.png`, '--full'])

  const pageText = run(['get', 'text', 'body'], { returnOutput: true })
  if (!pageText.match(/Você está na lista|You are on the list/)) {
    throw new Error('Waitlist success state was not rendered')
  }

  run(['open', `${baseUrl}/login`])
  run(['wait', '2000'])
  run(['screenshot', `${outDir}/05-login-route.png`, '--full'])

  const currentUrl = run(['get', 'url'], { returnOutput: true })
  if (!currentUrl.includes('/login')) {
    throw new Error(`Expected login route, got ${currentUrl}`)
  }

  console.log('✅ DevNG waitlist smoke test passed')
  console.log(`📸 Screenshots: ${outDir}`)
  console.log(`📧 Submitted email: ${email}`)
} catch (error) {
  console.error('❌ DevNG waitlist smoke test failed:', error.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
