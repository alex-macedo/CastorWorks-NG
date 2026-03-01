import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type AnalyticsPayload = {
  kpis: {
    totalRequests: number
    successRate: number
    errorRate: number
    guardrailBlocks: number
    partialSuccess: number
    p95DurationMs: number
  }
  topIntents: Array<{ intent: string; count: number }>
  topTools: Array<{ tool: string; count: number }>
  recent: Array<Record<string, unknown>>
}

export default function CastorMindAIAnalytics() {
  const navigate = useNavigate()
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const loadAnalytics = async (daysFilter: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-castormind-analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ days: daysFilter }),
        },
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load analytics')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics(days)
  }, [days])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CastorMind-AI Analytics</h1>
          <p className="text-sm text-muted-foreground">Action usage, reliability, and safety telemetry</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/castormind-ai')}>Back to Chat</Button>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading analytics...</Card>}
      {error && <Card className="p-6 text-sm text-red-500">{error}</Card>}

      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Total Requests</p><p className="text-2xl font-semibold">{data.kpis.totalRequests}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Success Rate</p><p className="text-2xl font-semibold">{data.kpis.successRate}%</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Error Rate</p><p className="text-2xl font-semibold">{data.kpis.errorRate}%</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Guardrail Blocks</p><p className="text-2xl font-semibold">{data.kpis.guardrailBlocks}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Partial Success</p><p className="text-2xl font-semibold">{data.kpis.partialSuccess}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">p95 Latency</p><p className="text-2xl font-semibold">{data.kpis.p95DurationMs}ms</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Top Intents</h2>
              <div className="space-y-2">
                {data.topIntents.map(item => (
                  <div key={item.intent} className="flex items-center justify-between text-sm">
                    <span>{item.intent}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
                {data.topIntents.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Top Tools</h2>
              <div className="space-y-2">
                {data.topTools.map(item => (
                  <div key={item.tool} className="flex items-center justify-between text-sm">
                    <span>{item.tool}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
                {data.topTools.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

