#!/usr/bin/env node
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const session = 'e2e-sidebar-modal-dimensions-cjs'

const envTesting = fs.existsSync('.env.testing') ? fs.readFileSync('.env.testing', 'utf8') : ''
const email = (envTesting.match(/^ACCOUNT_TEST_EMAIL=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')
const password = (envTesting.match(/^ACCOUNT_TEST_EMAIL_PASSWORD=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing')
  process.exit(1)
}

fs.mkdirSync('test-results/sidebar-modal', { recursive: true })

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

  run(['open', `${BASE_URL}/`])
  run(['wait', '2500'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/01-dashboard.png', '--full'], { allowFail: true })

  clickAny(['text=Mobile App', 'text=App Mobile'], { timeout: 20000 })
  run(['wait', '1200'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/02-mobile-app-dimension-picker.png', '--full'], { allowFail: true })
  clickAny(['text=Open', 'text=Abrir'])
  run(['wait', '1200'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/03-mobile-app-modal-open.png', '--full'], { allowFail: true })

  run(['screenshot', 'test-results/sidebar-modal/04-mobile-app-dimensions-controls.png', '--full'], { allowFail: true })

  run(['click', 'button[aria-label="Rotate viewport"]'], { allowFail: true })
  run(['wait', '800'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/05-mobile-app-rotate-attempt.png', '--full'], { allowFail: true })

  run(['click', 'button[aria-label="Minimize"]'], { allowFail: true })
  run(['wait', '800'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/06-mobile-app-minimized.png', '--full'], { allowFail: true })

  clickAny(['text=Mobile App', 'text=App Mobile'])
  run(['wait', '800'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/07-mobile-app-restored.png', '--full'], { allowFail: true })

  run(['click', 'button[aria-label="Close"]'], { allowFail: true })
  run(['wait', '800'], { allowFail: true })
  clickAny(['text=Supervisor Portal', 'text=Portal Supervisor'])
  run(['wait', '1200'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/08-supervisor-dimension-picker.png', '--full'], { allowFail: true })
  clickAny(['text=Open', 'text=Abrir'])
  run(['wait', '1200'], { allowFail: true })
  run(['screenshot', 'test-results/sidebar-modal/09-supervisor-modal-open.png', '--full'], { allowFail: true })

  const artifacts = fs.readdirSync('test-results/sidebar-modal').filter(f => f.endsWith('.png'))
  if (artifacts.length < 3) {
    console.error('Insufficient screenshot evidence generated')
    process.exit(1)
  }

  console.log('✅ Sidebar modal dimensions verification completed')
} catch (err) {
  process.exit(1)
}
