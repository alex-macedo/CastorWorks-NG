/**
 * Task Runner Bridge — local HTTP server that runs ai-task-runner.sh and streams output via SSE.
 * Used by the "AI To Work" button in the Roadmap UI.
 *
 * Usage: node scripts/task-runner-bridge.js
 *   Port: TASK_RUNNER_BRIDGE_PORT (default 3847)
 *
 * Endpoints:
 *   GET  /health  — { ok: true }
 *   POST /run     — body: { maxItems?: number, dryRun?: boolean }; streams output as text/event-stream
 */

import { createServer } from 'http'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = path.resolve(__dirname, '..')
const SCRIPT_PATH = path.join(__dirname, 'ai-task-runner.sh')

const PORT = Number(process.env.TASK_RUNNER_BRIDGE_PORT) || 3847
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])

function setCors (res, req) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson (res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}

function sendSse (res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders && res.flushHeaders()
}

function writeSseLine (res, data) {
  const payload = (typeof data === 'string' ? data : JSON.stringify(data))
    .replace(/\n/g, '\ndata: ')
  res.write(`data: ${payload}\n\n`)
}

const server = createServer((req, res) => {
  setCors(res, req)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = req.url?.split('?')[0] ?? '/'

  if (url === '/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (url === '/run' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      let maxItems = 1
      let dryRun = false
      try {
        const parsed = body ? JSON.parse(body) : {}
        if (parsed.maxItems != null) maxItems = Math.max(0, Number(parsed.maxItems)) || 1
        dryRun = Boolean(parsed.dryRun)
      } catch (_) {}

      const args = []
      if (dryRun) args.push('--dry-run')
      else if (maxItems > 0) args.push('--max-items', String(maxItems))

      sendSse(res)

      const proc = spawn('bash', [SCRIPT_PATH, ...args], {
        cwd: PROJECT_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      const onData = (chunk) => {
        const text = chunk.toString()
        writeSseLine(res, text)
      }
      proc.stdout.on('data', onData)
      proc.stderr.on('data', onData)

      proc.on('close', (code) => {
        writeSseLine(res, `\n[Process exited with code ${code}]`)
        res.end()
      })
      proc.on('error', (err) => {
        writeSseLine(res, `[Spawn error: ${err.message}]`)
        res.end()
      })
    })
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[task-runner-bridge] Listening on http://127.0.0.1:${PORT}`)
  console.log('[task-runner-bridge] GET /health  POST /run')
})
