#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const proposalToken = process.env.PROPOSAL_TOKEN

if (!proposalToken) {
  console.error('Missing PROPOSAL_TOKEN')
  process.exit(1)
}

const session = `e2e-public-proposal-branding-${Date.now()}`
const outDir = 'test-results/public-proposal-branding'

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

try {
  run(['open', `${baseUrl}/proposal/${proposalToken}`])
  run(['wait', '3500'])
  run(['screenshot', `${outDir}/01-public-proposal.png`, '--full'], { allowFail: true })

  const bodyText = run(['get', 'text', 'body'], { returnOutput: true })

  if (!bodyText.includes('Eagle Construtora')) {
    throw new Error('Expected proposal page to render the configured company name')
  }

  if (bodyText.includes('Your Company')) {
    throw new Error('Proposal page is still rendering the hardcoded fallback company name')
  }

  console.log('✅ Public proposal branding verified')
} catch (error) {
  console.error(`❌ Public proposal branding test failed: ${error.message}`)
  process.exit(1)
}
