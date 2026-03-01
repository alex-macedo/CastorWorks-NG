import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

const TASK_RUNNER_BRIDGE_URL = (import.meta as unknown as { env?: { VITE_TASK_RUNNER_BRIDGE_URL?: string } }).env?.VITE_TASK_RUNNER_BRIDGE_URL ?? 'http://localhost:3847'

export interface TaskMeta {
  id: string
  title: string
  priority: string
  category: string
  sprint_id: string
  sprint_identifier?: string
}

export default function AiToWorkPage() {
  const { t } = useLocalization()
  const [searchParams] = useSearchParams()
  const maxItems = Math.max(1, parseInt(searchParams.get('maxItems') ?? '1', 10) || 1)
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null)
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [taskMeta, setTaskMeta] = useState<TaskMeta | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current && outputLines.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [outputLines])

  useEffect(() => {
    let cancelled = false
    const HEALTH_TIMEOUT_MS = 10_000

    async function run() {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
        const healthRes = await fetch(`${TASK_RUNNER_BRIDGE_URL}/health`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const ok = healthRes.ok && (await healthRes.json()).ok
        if (cancelled) return
        setBridgeOnline(ok)
        if (!ok) return
        setRunning(true)
        const runRes = await fetch(`${TASK_RUNNER_BRIDGE_URL}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxItems }),
        })
        if (cancelled) return
        if (!runRes.ok || !runRes.body) {
          setRunError(runRes.statusText || 'Request failed')
          setRunning(false)
          return
        }
        const reader = runRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (cancelled) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).replace(/^data: /gm, '')
              if (payload.startsWith('AI_TASK_META|')) {
                try {
                  const json = JSON.parse(payload.slice('AI_TASK_META|'.length)) as TaskMeta
                  setTaskMeta(json)
                } catch {
                  // ignore parse errors
                }
              } else {
                setOutputLines((prev) => [...prev, payload])
              }
            }
          }
        }
        if (!cancelled && buffer && buffer.startsWith('data: ')) {
          const payload = buffer.slice(6).replace(/^data: /gm, '')
          if (payload.startsWith('AI_TASK_META|')) {
            try {
              const json = JSON.parse(payload.slice('AI_TASK_META|'.length)) as TaskMeta
              setTaskMeta(json)
            } catch {
              // ignore
            }
          } else {
            setOutputLines((prev) => [...prev, payload])
          }
        }
      } catch (err) {
        if (!cancelled) {
          setBridgeOnline(false)
          const msg =
            err instanceof Error && err.name === 'AbortError'
              ? t('roadmap.aiToWorkDialog.bridgeTimeout')
              : err instanceof Error ? err.message : 'Connection failed'
          setRunError(msg)
        }
      } finally {
        if (!cancelled) setRunning(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [maxItems, t])

  if (bridgeOnline === false) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-8">
        <h1 className="text-2xl font-bold">{t('roadmap.aiToWorkDialog.title')}</h1>
        <p className="text-muted-foreground text-center max-w-md">{t('roadmap.aiToWorkDialog.bridgeNotRunning')}</p>
        <p className="text-sm text-muted-foreground">{t('roadmap.aiToWorkDialog.startBridge')}</p>
        <code className="rounded-md bg-muted px-4 py-2 font-mono text-sm">npm run task-runner:bridge</code>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/roadmap">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const priorityLabel = taskMeta?.priority ? t(`roadmap.priority.${taskMeta.priority}` as 'roadmap.priority.high') || taskMeta.priority : null
  const categoryLabel = taskMeta?.category ? t(`roadmap.category.${taskMeta.category === 'bug_fix' ? 'bugFix' : taskMeta.category}` as 'roadmap.category.feature') || taskMeta.category : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/roadmap" className="text-zinc-300 hover:text-white">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <span className="text-sm font-medium text-zinc-300">{t('roadmap.aiToWorkDialog.title')}</span>
          {running && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              {t('roadmap.aiToWorkDialog.running')}
            </span>
          )}
        </div>
      </header>
      {taskMeta && (
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm">
          <div>
            <span className="text-zinc-500 block">{t('roadmap.aiToWorkDialog.taskSummary')}</span>
            <span className="text-zinc-100 font-medium truncate block" title={taskMeta.title || ''}>{taskMeta.title || t('roadmap.aiToWorkDialog.untitledTask')}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t('roadmap.priority.label')}</span>
            <span className="text-zinc-100">{priorityLabel ?? '—'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t('roadmap.category.label')}</span>
            <span className="text-zinc-100">{categoryLabel ?? (taskMeta.category || '—')}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t('roadmap.sprintLabel')}</span>
            <span className="text-zinc-100">
              {(taskMeta.sprint_identifier || (taskMeta.sprint_id ? `${taskMeta.sprint_id.slice(0, 8)}…` : null)) ?? t('roadmap.noSprint')}
            </span>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {runError && (
          <div className="shrink-0 bg-destructive/20 text-destructive px-4 py-2 text-sm">{runError}</div>
        )}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4 min-h-0">
          <pre
            className="font-mono text-sm text-zinc-100 whitespace-pre-wrap break-words min-h-full"
          >
            {bridgeOnline === null && outputLines.length === 0 && !runError && (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" aria-hidden />
                {t('roadmap.aiToWorkDialog.checking')}
              </span>
            )}
            {outputLines.length > 0 && outputLines.join('\n')}
          </pre>
        </div>
      </div>
    </div>
  )
}
