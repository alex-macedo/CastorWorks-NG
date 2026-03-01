#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const changelogDir = path.join(repoRoot, 'docs', 'changelog')

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
}

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    check: args.includes('--check'),
  }
}

function getDateStringFromHeadCommit() {
  const commitDate = execSync('git show -s --format=%cs HEAD', {
    encoding: 'utf8',
  }).trim()
  return commitDate
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim()
    if (!output) return []
    return output.split('\n')
  } catch {
    return []
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function getChangelogPath(dateString) {
  return path.join(changelogDir, `changelog-${dateString}.md`)
}

function createDailyChangelogFile(filePath, dateString) {
  const template = `# Changelog - ${dateString}

All notable updates recorded for commits on ${dateString}.

## Changes

- Initialized daily changelog file.
`
  fs.writeFileSync(filePath, template, 'utf8')
}

function appendCommitEntry(filePath) {
  const now = new Date()
  const timestamp = now.toISOString()
  const branch = getCurrentBranch()
  const stagedFiles = getStagedFiles()

  if (stagedFiles.length === 0) {
    log('ℹ️ No staged files detected. Skipping changelog entry append.', COLORS.CYAN)
    return
  }

  const filesList = stagedFiles.map((file) => `  - \`${file}\``).join('\n')

  const entry = `
### Commit preparation - ${timestamp}

- Branch: \`${branch}\`
- Staged files:
${filesList}
`

  fs.appendFileSync(filePath, entry, 'utf8')
}

function runCheckMode() {
  const commitDate = getDateStringFromHeadCommit()
  const changelogPath = getChangelogPath(commitDate)
  const relativePath = path.relative(repoRoot, changelogPath)

  if (!fs.existsSync(changelogPath)) {
    log(
      `❌ Missing required changelog file for HEAD commit date (${commitDate}): ${relativePath}`,
      COLORS.RED
    )
    process.exit(1)
  }

  log(`✅ Changelog file exists for HEAD commit date: ${relativePath}`, COLORS.GREEN)
}

function runGenerateMode() {
  const today = getTodayDateString()
  const changelogPath = getChangelogPath(today)
  const relativePath = path.relative(repoRoot, changelogPath)

  ensureDirectory(changelogDir)

  if (!fs.existsSync(changelogPath)) {
    createDailyChangelogFile(changelogPath, today)
    log(`✅ Created ${relativePath}`, COLORS.GREEN)
  } else {
    log(`ℹ️ Using existing ${relativePath}`, COLORS.CYAN)
  }

  appendCommitEntry(changelogPath)
  log(`✅ Appended commit entry to ${relativePath}`, COLORS.GREEN)

  try {
    execSync(`git add "${relativePath}"`, { stdio: 'ignore' })
    log(`✅ Staged ${relativePath}`, COLORS.GREEN)
  } catch {
    log(`⚠️ Could not stage ${relativePath}`, COLORS.YELLOW)
  }
}

function main() {
  const args = parseArgs()
  log(`${COLORS.BOLD}📝 Daily Changelog Automation${COLORS.RESET}`)

  if (args.check) {
    runCheckMode()
    return
  }

  runGenerateMode()
}

main()
