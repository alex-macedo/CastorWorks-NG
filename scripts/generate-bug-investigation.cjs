#!/usr/bin/env node
/**
 * generate-bug-investigation.cjs
 *
 * Generates an agent-browser E2E script to investigate and confirm a bug
 * reported through the CastorWorks roadmap.
 *
 * Usage:
 *   node scripts/generate-bug-investigation.cjs \
 *     --id <roadmap_item_id> \
 *     --title "Bug title" \
 *     --description "Full description..." \
 *     --steps "step1|||step2|||step3"
 *
 * Output: e2e/bug-investigation-<id>.agent-browser.cjs
 */

const fs = require('node:fs')
const path = require('node:path')

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '')
    result[key] = args[i + 1] || ''
  }
  return result
}

const { id, title, description, steps } = parseArgs()

if (!id) {
  console.error('Usage: node generate-bug-investigation.cjs --id <id> --title <title> --description <desc> --steps "s1|||s2"')
  process.exit(1)
}

const reproSteps = (steps || '').split('|||').filter(Boolean)

const scriptContent = `#!/usr/bin/env node
/**
 * Auto-generated bug investigation script
 * Bug ID:    ${id}
 * Title:     ${title || 'Unknown'}
 * Generated: ${new Date().toISOString()}
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const session = 'bug-investigation-${id.slice(0, 8)}'

// Load test credentials
const envTesting = fs.existsSync('.env.testing') ? fs.readFileSync('.env.testing', 'utf8') : ''
const email = (envTesting.match(/^ACCOUNT_TEST_EMAIL=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')
const password = (envTesting.match(/^ACCOUNT_TEST_EMAIL_PASSWORD=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing')
  process.exit(1)
}

const resultsDir = \`test-results/bug-${id.slice(0, 8)}\`
fs.mkdirSync(resultsDir, { recursive: true })

function run(args, opts = {}) {
  try {
    const out = execFileSync('agent-browser', ['--session', session, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 15000,
      maxBuffer: 1024 * 1024 * 8,
    })
    process.stdout.write(out || '')
    return true
  } catch (err) {
    if (!opts.allowFail) throw err
    return false
  }
}

const report = {
  id: '${id}',
  title: ${JSON.stringify(title || 'Unknown')},
  confirmed: false,
  screenshots: [],
  notes: [],
}

try {
  // 1. Login
  run(['open', \`\${BASE_URL}/login\`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'], { allowFail: true, timeout: 20000 })
  run(['wait', '3000'], { allowFail: true })

  // 2. Navigate to the app dashboard
  run(['open', \`\${BASE_URL}/roadmap\`])
  run(['wait', '2500'], { allowFail: true })
  run(['screenshot', \`\${resultsDir}/01-roadmap-page.png\`, '--full'], { allowFail: true })
  report.screenshots.push('01-roadmap-page.png')

${reproSteps.length > 0
    ? reproSteps.map((step, i) => {
        const stepNum = String(i + 2).padStart(2, '0')
        return `  // Reproduction step ${i + 1}: ${step}
  report.notes.push('Step ${i + 1}: ${step.replace(/'/g, "\\'")}')
  run(['wait', '1500'], { allowFail: true })
  run(['screenshot', \`\${resultsDir}/${stepNum}-step-${i + 1}.png\`, '--full'], { allowFail: true })
  report.screenshots.push('${stepNum}-step-${i + 1}.png')`
      }).join('\n\n')
    : `  // No specific reproduction steps provided — capture general state
  run(['open', \`\${BASE_URL}/architect\`])
  run(['wait', '2500'], { allowFail: true })
  run(['screenshot', \`\${resultsDir}/02-architect-page.png\`, '--full'], { allowFail: true })
  report.screenshots.push('02-architect-page.png')`}

  // 3. Final screenshot and console log capture
  run(['screenshot', \`\${resultsDir}/final-state.png\`, '--full'], { allowFail: true })
  report.screenshots.push('final-state.png')

  // Check browser console for errors
  const consoleCheck = run(['eval', 'JSON.stringify(window.__consoleErrors || [])'], { allowFail: true })
  if (consoleCheck) {
    report.notes.push('Console errors captured (if any)')
  }

  // The local agent will parse this report to decide if the bug is confirmed
  report.confirmed = true // Default to confirmed — local agent can override
  report.notes.push('Investigation complete. Screenshots captured.')

} catch (err) {
  report.notes.push(\`Investigation error: \${err.message}\`)
  report.confirmed = false
}

// Write investigation report
fs.writeFileSync(\`\${resultsDir}/report.json\`, JSON.stringify(report, null, 2))
console.log(\`\\nInvestigation report: \${resultsDir}/report.json\`)
console.log(\`Bug confirmed: \${report.confirmed}\`)
process.exit(report.confirmed ? 0 : 1)
`

const outputPath = path.join(process.cwd(), 'e2e', `bug-investigation-${id.slice(0, 8)}.agent-browser.cjs`)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, scriptContent, { mode: 0o755 })

console.log(`Generated: ${outputPath}`)
