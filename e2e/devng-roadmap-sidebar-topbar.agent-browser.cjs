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

const session = `e2e-devng-roadmap-sidebar-topbar-${Date.now()}`
const outDir = 'test-results/devng-roadmap-sidebar-topbar'

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
  run(['set', 'viewport', '1600', '1100'])
  run(['open', `${baseUrl}/login`])
  run(['wait', '2500'])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '5000'])
  run(['screenshot', `${outDir}/01-dashboard-after-login.png`, '--full'])

  const navState = evalJson(`
    (() => {
      const visible = (el) => {
        if (!el) return false
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
      }

      const topbar = Array.from(document.querySelectorAll('button,a'))
        .filter(visible)
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean)

      const sidebar = Array.from(document.querySelectorAll('[data-sidebar] button, [data-sidebar] a'))
        .filter(visible)
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean)

      return JSON.stringify({ topbar, sidebar, path: window.location.pathname })
    })()
  `)

  if (navState.path === '/login') {
    throw new Error('Login did not complete for verification account')
  }

  if (navState.topbar.some((label) => /Roadmap|Roteiro/i.test(label))) {
    throw new Error(`Roadmap is still visible in topbar for non-global-admin: ${navState.topbar.join(' | ')}`)
  }

  if (!navState.topbar.some((label) => /Weather|Clima/i.test(label))) {
    throw new Error(`Weather button was not found in topbar: ${navState.topbar.join(' | ')}`)
  }

  if (!navState.topbar.some((label) => /My Timesheet|Minha Planilha de Horas/i.test(label))) {
    throw new Error(`Time tracking shortcut was not found in topbar: ${navState.topbar.join(' | ')}`)
  }

  if (navState.sidebar.some((label) => /AI Chat|Chat de IA|Chat IA/i.test(label))) {
    throw new Error(`AI Chat is still visible in sidebar: ${navState.sidebar.join(' | ')}`)
  }

  run(['open', `${baseUrl}/roadmap`])
  run(['wait', '2500'])
  run(['screenshot', `${outDir}/02-roadmap-guard.png`, '--full'])

  const roadmapGuard = evalJson(`
    (() => JSON.stringify({
      path: window.location.pathname,
      text: document.body.innerText
    }))()
  `)

  if (!/Access Denied|Acesso negado|Back to Dashboard|Voltar ao painel/i.test(roadmapGuard.text)) {
    throw new Error(`Roadmap guard did not block non-global-admin access. Path: ${roadmapGuard.path}`)
  }

  console.log('✅ DevNG roadmap/sidebar/topbar smoke test passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (error) {
  console.error('❌ DevNG roadmap/sidebar/topbar smoke test failed:', error.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
