#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = path.resolve(__dirname, '..')

const DEFAULT_SUPABASE_URL = 'https://dev.castorworks.cloud'

function parseArgs(argv) {
  const args = {
    team: '',
    mapping: '',
    apply: false,
    dbMode: 'ssh',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--team') {
      args.team = argv[i + 1] || ''
      i += 1
    } else if (arg === '--mapping') {
      args.mapping = argv[i + 1] || ''
      i += 1
    } else if (arg === '--apply') {
      args.apply = true
    } else if (arg === '--db-mode') {
      args.dbMode = argv[i + 1] || 'ssh'
      i += 1
    }
  }

  if (!args.team || !args.mapping) {
    throw new Error('Usage: node scripts/reconcile-roadmap-team.mjs --team <team-name> --mapping <file> [--apply]')
  }

  return args
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (![
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_SUPABASE_SERVICE_ROLE_KEY',
    ].includes(key)) {
      continue
    }
    const value = rawValue.replace(/^"/, '').replace(/"$/, '')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readTeamTasks(teamName) {
  const tasksDir = path.join(PROJECT_DIR, '.omx', 'state', 'team', teamName, 'tasks')
  if (!fs.existsSync(tasksDir)) {
    throw new Error(`Team task directory not found: ${tasksDir}`)
  }

  const entries = fs.readdirSync(tasksDir)
    .filter((name) => /^task-\d+\.json$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0))

  const tasks = entries.map((name) => {
    const filePath = path.join(tasksDir, name)
    return readJson(filePath)
  })

  return tasks
}

function extractCommit(resultText) {
  if (!resultText) return null

  const patterns = [
    /\b[Cc]ommit:\s*([0-9a-f]{7,40})\b/,
    /\b([0-9a-f]{7,40})\b/,
  ]

  for (const pattern of patterns) {
    const match = resultText.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

function remoteBranchExists(branch) {
  const output = execFileSync('git', ['ls-remote', '--heads', 'origin', branch], {
    cwd: PROJECT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return output.trim().length > 0
}

function shortSha(commit) {
  return commit ? commit.slice(0, 7) : 'unknown'
}

function buildComment({
  mapping,
  commit,
  teamName,
  completedTaskIds,
}) {
  if (mapping.comment) return mapping.comment

  const parts = [
    `Leader reconciliation: team \`${teamName}\` completed task${completedTaskIds.length === 1 ? '' : 's'} ${completedTaskIds.map((value) => `#${value}`).join(', ')}.`,
  ]

  if (mapping.branch) {
    parts.push(`GitHub branch: \`${mapping.branch}\`${commit ? ` (commit \`${shortSha(commit)}\`)` : ''}.`)
  }

  if (Array.isArray(mapping.verification) && mapping.verification.length > 0) {
    parts.push(`Verification: ${mapping.verification.join('; ')}.`)
  }

  if (mapping.summary) {
    parts.push(mapping.summary)
  }

  return parts.join(' ')
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(data)}`)
  }

  return data
}

function getApiConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    ''

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY is required')
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  return { supabaseUrl, headers }
}

function quoteSql(value) {
  return String(value).replace(/'/g, "''")
}

function runSshPsql(sql) {
  const keyPath = path.join(process.env.HOME || '', '.ssh', 'castorworks_deploy')
  const command = "docker exec -i castorworks-ng-db psql -U postgres -d postgres -A -F '|' -t -P pager=off"

  return execFileSync('ssh', ['-i', keyPath, 'castorworks', command], {
    cwd: PROJECT_DIR,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

async function getAdminUserId(api) {
  const params = new URLSearchParams({
    role: 'eq.admin',
    select: 'user_id',
    limit: '1',
  })

  const rows = await fetchJson(`${api.supabaseUrl}/rest/v1/user_roles?${params.toString()}`, {
    headers: api.headers,
  })

  const userId = rows?.[0]?.user_id
  if (!userId) {
    throw new Error('No admin user found for roadmap comments')
  }

  return userId
}

function getAdminUserIdSsh() {
  const output = runSshPsql("SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;")
  if (!output) {
    throw new Error('No admin user found for roadmap comments')
  }

  return output.split('\n')[0].trim()
}

async function getSprintId(api, sprintIdentifier) {
  const params = new URLSearchParams({
    sprint_identifier: `eq.${sprintIdentifier}`,
    select: 'id',
    limit: '1',
  })

  const rows = await fetchJson(`${api.supabaseUrl}/rest/v1/sprints?${params.toString()}`, {
    headers: api.headers,
  })

  const sprintId = rows?.[0]?.id
  if (!sprintId) {
    throw new Error(`Sprint not found for sprint_identifier=${sprintIdentifier}`)
  }

  return sprintId
}

function getSprintIdSsh(sprintIdentifier) {
  const output = runSshPsql(
    `SELECT id FROM public.sprints WHERE sprint_identifier = '${quoteSql(sprintIdentifier)}' LIMIT 1;`
  )

  const sprintId = output.split('\n')[0]?.trim()
  if (!sprintId) {
    throw new Error(`Sprint not found for sprint_identifier=${sprintIdentifier}`)
  }

  return sprintId
}

async function getRoadmapItem(api, sprintId, title) {
  const params = new URLSearchParams({
    sprint_id: `eq.${sprintId}`,
    title: `eq.${title}`,
    select: 'id,title,status',
    limit: '1',
  })

  const rows = await fetchJson(`${api.supabaseUrl}/rest/v1/roadmap_items?${params.toString()}`, {
    headers: api.headers,
  })

  const item = rows?.[0]
  if (!item) {
    throw new Error(`Roadmap item not found for title="${title}" in sprint_id=${sprintId}`)
  }

  return item
}

function getRoadmapItemSsh(sprintId, title) {
  const output = runSshPsql(
    `SELECT id,title,status FROM public.roadmap_items WHERE sprint_id = '${quoteSql(sprintId)}' AND title = '${quoteSql(title)}' LIMIT 1;`
  )

  const [id, itemTitle, status] = output.split('|').map((value) => value?.trim())
  if (!id) {
    throw new Error(`Roadmap item not found for title="${title}" in sprint_id=${sprintId}`)
  }

  return {
    id,
    title: itemTitle,
    status,
  }
}

async function updateRoadmapItem(api, itemId, status) {
  const payload = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'done') {
    payload.completed_at = new Date().toISOString()
  }

  const params = new URLSearchParams({
    id: `eq.${itemId}`,
  })

  await fetchJson(`${api.supabaseUrl}/rest/v1/roadmap_items?${params.toString()}`, {
    method: 'PATCH',
    headers: api.headers,
    body: JSON.stringify(payload),
  })
}

async function insertComment(api, adminUserId, itemId, content) {
  await fetchJson(`${api.supabaseUrl}/rest/v1/roadmap_item_comments`, {
    method: 'POST',
    headers: api.headers,
    body: JSON.stringify({
      roadmap_item_id: itemId,
      user_id: adminUserId,
      content,
    }),
  })
}

function applyRoadmapItemUpdateSsh({ itemId, status, adminUserId, content }) {
  const sql = `
BEGIN;
UPDATE public.roadmap_items
SET status = '${quoteSql(status)}',
    updated_at = NOW(),
    completed_at = CASE WHEN '${quoteSql(status)}' = 'done' THEN COALESCE(completed_at, NOW()) ELSE completed_at END
WHERE id = '${quoteSql(itemId)}';

INSERT INTO public.roadmap_item_comments (roadmap_item_id, user_id, content)
VALUES ('${quoteSql(itemId)}', '${quoteSql(adminUserId)}', '${quoteSql(content)}');
COMMIT;
`

  runSshPsql(sql)
}

async function main() {
  process.chdir(PROJECT_DIR)

  loadEnvFile(path.join(PROJECT_DIR, '.env'))
  loadEnvFile(path.join(PROJECT_DIR, '.env.testing'))

  const args = parseArgs(process.argv.slice(2))
  const mappingPath = path.resolve(PROJECT_DIR, args.mapping)
  const mapping = readJson(mappingPath)
  const tasks = readTeamTasks(args.team)
  const tasksById = new Map(tasks.map((task) => [String(task.id), task]))
  const api = args.dbMode === 'rest' ? getApiConfig() : null
  const sprintId = args.dbMode === 'rest'
    ? await getSprintId(api, mapping.sprintIdentifier)
    : getSprintIdSsh(mapping.sprintIdentifier)
  const adminUserId = args.dbMode === 'rest'
    ? await getAdminUserId(api)
    : getAdminUserIdSsh()

  const results = []

  for (const itemMapping of mapping.items || []) {
    const completedTasks = (itemMapping.taskIds || []).map((taskId) => {
      const task = tasksById.get(String(taskId))
      if (!task) {
        throw new Error(`Task ${taskId} not found in team ${args.team}`)
      }
      if (task.status !== 'completed') {
        throw new Error(`Task ${taskId} is not completed (status=${task.status})`)
      }
      return task
    })

    const commit =
      itemMapping.commit ||
      completedTasks
        .map((task) => extractCommit(String(task.result || '')))
        .find(Boolean) ||
      null

    if (itemMapping.branch && !remoteBranchExists(itemMapping.branch)) {
      throw new Error(`Remote branch not found on origin: ${itemMapping.branch}`)
    }

    const roadmapItem = args.dbMode === 'rest'
      ? await getRoadmapItem(api, sprintId, itemMapping.title)
      : getRoadmapItemSsh(sprintId, itemMapping.title)
    const comment = buildComment({
      mapping: itemMapping,
      commit,
      teamName: args.team,
      completedTaskIds: completedTasks.map((task) => String(task.id)),
    })

    const outcome = {
      title: itemMapping.title,
      itemId: roadmapItem.id,
      status: itemMapping.status || 'done',
      branch: itemMapping.branch || null,
      commit,
      comment,
      apply: args.apply,
    }

    if (args.apply) {
      if (args.dbMode === 'rest') {
        await updateRoadmapItem(api, roadmapItem.id, outcome.status)
        await insertComment(api, adminUserId, roadmapItem.id, comment)
      } else {
        applyRoadmapItemUpdateSsh({
          itemId: roadmapItem.id,
          status: outcome.status,
          adminUserId,
          content: comment,
        })
      }
    }

    results.push(outcome)
  }

  console.log(JSON.stringify({
    team: args.team,
    dbMode: args.dbMode,
    sprintIdentifier: mapping.sprintIdentifier,
    apply: args.apply,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
