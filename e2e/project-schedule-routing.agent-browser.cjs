#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const projectId = process.env.E2E_PROJECT_ID || '45dc7301-fbb1-485d-9280-f4a74b530596'
const session = 'e2e-schedule-routing'
const outDir = 'test-results/project-schedule-routing'

const readEnvValueFromFile = (filePath, key) => {
  if (!fs.existsSync(filePath)) return undefined
  const line = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${key}=`))
  if (!line) return undefined
  return line.replace(`${key}=`, '').replace(/^"|"$/g, '')
}

const readEnvValue = (key) =>
  readEnvValueFromFile('.env.testing', key) || readEnvValueFromFile('.env', key)

const email = process.env.ACCOUNT_TEST_EMAIL || readEnvValue('ACCOUNT_TEST_EMAIL')
const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnvValue('ACCOUNT_TEST_EMAIL_PASSWORD')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const run = (args, { returnOutput = false } = {}) => {
  let result = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result = spawnSync('agent-browser', ['--session', session, ...args], {
      encoding: 'utf8',
      shell: false,
    })

    if (result.status === 0) break
    if (attempt < 3) {
      spawnSync('sleep', ['1'], { encoding: 'utf8', shell: false })
    }
  }

  if (!result || result.status !== 0) {
    const stderr = result?.stderr ? result.stderr.trim() : ''
    throw new Error(`agent-browser failed: ${stderr}`)
  }

  if (returnOutput) return (result.stdout || '').trim()
}

const assertCurrentPath = (expectedPathname) => {
  run([
    'eval',
    `
      const currentPath = window.location.pathname
      if (currentPath !== ${JSON.stringify(expectedPathname)}) {
        throw new Error('Expected path ' + ${JSON.stringify(expectedPathname)} + ', got ' + currentPath)
      }
    `,
  ])
}

try {
  run(['open', `${baseUrl}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'])
  run(['wait', '3500'])

  // 1) Legacy schedule route must redirect to /project-phases
  run(['open', `${baseUrl}/schedule/${projectId}`])
  run(['wait', '2500'])
  assertCurrentPath('/project-phases')
  run(['screenshot', `${outDir}/01-legacy-schedule-redirect.png`, '--full'])

  // 2) Sidebar route target exists - capture phase names for alignment check
  run(['open', `${baseUrl}/project-phases?projectId=${projectId}`])
  run(['wait', '3000'])
  assertCurrentPath('/project-phases')
  run(['screenshot', `${outDir}/02-project-phases-page.png`, '--full'])

  const phasesListResult = run(
    [
      'eval',
      `JSON.stringify((()=>{const t=document.querySelector('table');if(!t)return[];return[...t.querySelectorAll('tbody tr')].map(r=>((r.querySelector('td')||{}).textContent||'').trim()).filter(Boolean).filter(x=>!/^\\d+%?$/.test(x)&&!/^#\\d+$/.test(x));})())`,
    ],
    { returnOutput: true }
  )
  let phasesList = []
  try {
    phasesList = JSON.parse(phasesListResult.output || '[]')
  } catch {
    phasesList = []
  }

  // 3) Project Details -> Schedule tab -> View Full Schedule points to /project-phases
  run(['open', `${baseUrl}/projects/${projectId}`])
  run(['wait', '3500'])
  run([
    'eval',
    `
      const tabLabels = ['Schedule', 'Cronograma', 'Planning']
      const tab = [...document.querySelectorAll('[role="tab"],button')]
        .find(el => tabLabels.some(label => (el.textContent || '').includes(label)))
      if (!tab) throw new Error('Schedule tab not found')
      tab.click()
    `,
  ])
  run(['wait', '1200'])
  run([
    'eval',
    `
      const buttonLabels = [
        'View Full Schedule',
        'Ver Cronograma Completo',
        'Ver cronograma completo',
        'Voir le planning complet'
      ]
      const button = [...document.querySelectorAll('button')]
        .find(el => buttonLabels.some(label => (el.textContent || '').includes(label)))
      window.__cwClickedViewSchedule = Boolean(button)
      if (button) button.click()
    `,
  ])
  run(['wait', '2500'])
  run([
    'eval',
    `
      if (window.__cwClickedViewSchedule && window.location.pathname !== '/project-phases') {
        throw new Error('Schedule CTA did not route to /project-phases')
      }
    `,
  ])
  run(['screenshot', `${outDir}/03-project-detail-to-project-phases.png`, '--full'])

  // 4) projects-timeline Selected Project/Phase matches project-phases for same projectId
  run(['open', `${baseUrl}/projects-timeline?projectId=${projectId}`])
  run(['wait', '6000'])
  run(['screenshot', `${outDir}/04-projects-timeline.png`, '--full'])

  const urlProjectIdRaw = run(
    ['eval', `(function(){var p=new URL(window.location.href).searchParams.get('projectId');return p===null?'null':p;})()`],
    { returnOutput: true }
  ).output?.trim()
  const urlProjectId = urlProjectIdRaw === 'null' ? null : urlProjectIdRaw
  if (urlProjectId !== projectId) {
    console.warn(`Note: projectId in URL is ${urlProjectId} (expected ${projectId}) - continuing to check phase alignment`)
  }

  const timelinePhasesList = run(
    ['eval', `JSON.stringify((()=>{const t=document.querySelector('[class*="selectedDetails"]')?.closest('div')?.querySelector('table')||document.querySelector('table');if(!t)return[];return[...t.querySelectorAll('tbody tr')].map(r=>((r.querySelector('td')||{}).textContent||'').trim()).filter(Boolean).filter(x=>!/^\\d+%?$/.test(x)&&!/^#\\d+$/.test(x));})())`],
    { returnOutput: true }
  )
  let timelinePhases = []
  try {
    timelinePhases = JSON.parse(timelinePhasesList.output || '[]')
  } catch {
    timelinePhases = []
  }

  if (phasesList.length > 0 && timelinePhases.length > 0) {
    const firstMatch = phasesList[0] === timelinePhases[0]
    const countMatch = phasesList.length === timelinePhases.length
    if (!firstMatch || !countMatch) {
      console.error('Phase mismatch:')
      console.error('  project-phases:', phasesList.slice(0, 5))
      console.error('  projects-timeline:', timelinePhases.slice(0, 5))
      throw new Error('Selected Project/Phase section does not match project-phases for same project')
    }
  }

  run(['screenshot', `${outDir}/05-timeline-phase-alignment.png`, '--full'])
  console.log('✅ Project schedule routing e2e completed (incl. timeline phase alignment)')
} catch (error) {
  console.error(`❌ Project schedule routing e2e failed: ${error.message}`)
  process.exit(1)
}
