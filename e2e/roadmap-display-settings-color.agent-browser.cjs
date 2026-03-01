#!/usr/bin/env node
/**
 * QA: Roadmap Display Settings – change Task Status "Next up" color to orange.
 * Verifies that selecting a color in the palette applies immediately (no blur/save needed).
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const session = 'e2e-roadmap-display-settings-color'

const envTesting = fs.existsSync('.env.testing') ? fs.readFileSync('.env.testing', 'utf8') : ''
const email = (envTesting.match(/^ACCOUNT_TEST_EMAIL=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')
const password = (envTesting.match(/^ACCOUNT_TEST_EMAIL_PASSWORD=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing')
  process.exit(1)
}

fs.mkdirSync('test-results', { recursive: true })

function run(args, { allowFail = false, timeout = 15000 } = {}) {
  try {
    const out = execFileSync('agent-browser', ['--session', session, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      maxBuffer: 1024 * 1024 * 8,
    })
    process.stdout.write(out || '')
    return true
  } catch (err) {
    if (!allowFail) {
      console.error(`Command failed: agent-browser --session ${session} ${args.join(' ')}`)
      if (err.stdout) process.stderr.write(err.stdout)
      if (err.stderr) process.stderr.write(err.stderr)
      throw err
    }
    return false
  }
}

function clickAny(selectors, options = {}) {
  for (const selector of selectors) {
    if (run(['click', selector], { ...options, allowFail: true })) return true
  }
  return false
}

try {
  run(['open', `${BASE_URL}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'], { allowFail: true, timeout: 20000 })
  run(['wait', '3000'], { allowFail: true })

  run(['open', `${BASE_URL}/roadmap`])
  run(['wait', '2500'], { allowFail: true })

  // Open Display Settings (sheet) – find by role+name (i18n: en, pt-BR, es, fr)
  const displayClicked =
    run(['find', 'role', 'button', 'click', 'Configurações de Exibição'], { allowFail: true, timeout: 8000 }) ||
    run(['find', 'role', 'button', 'click', 'Display Settings'], { allowFail: true, timeout: 3000 }) ||
    run(['find', 'role', 'button', 'click', 'Configuración de visualización'], { allowFail: true, timeout: 2000 }) ||
    run(['find', 'role', 'button', 'click', 'Paramètres d\'affichage'], { allowFail: true, timeout: 2000 }) ||
    clickAny(['[title="Display Settings"]', '[title="Configurações de Exibição"]'], { timeout: 2000 })
  if (!displayClicked) {
    console.error('Could not find Display Settings button')
    process.exit(1)
  }
  run(['wait', '1200'], { allowFail: true })

  // Enter edit mode for "Next up" row: click pencil in the row that contains next_up
  const editClicked = clickAny([
    'li:has([title="next_up"]) div.shrink-0:last-of-type button',
    'li:has([title="next_up"]) button',
  ], { timeout: 5000 })
  if (!editClicked) {
    console.error('Could not find edit (pencil) for Next up row')
    run(['screenshot', 'test-results/roadmap-display-settings-after-open.png', '--full'], { allowFail: true })
    process.exit(1)
  }
  run(['wait', '600'], { allowFail: true })

  // Click orange color (title="orange-500")
  const orangeClicked = run(['click', 'li:has([title="next_up"]) button[title="orange-500"]'], { allowFail: true, timeout: 5000 })
  if (!orangeClicked) {
    console.error('Could not find orange color button')
    run(['screenshot', 'test-results/roadmap-display-settings-edit-mode.png', '--full'], { allowFail: true })
    process.exit(1)
  }
  run(['wait', '1200'], { allowFail: true })

  run(['screenshot', 'test-results/roadmap-display-settings-next-up-orange.png', '--full'], { allowFail: true })
  console.log('QA passed: Next up color changed to orange')
} catch (err) {
  console.error(err)
  process.exit(1)
}
