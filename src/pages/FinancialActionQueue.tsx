import { useState } from 'react'
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useFinancialActionQueue } from '@/hooks/useFinancialActionQueue'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import type { AIActionStatus, AIActionType, RiskLevel } from '@/types/finance'

const riskColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const statusColors: Record<AIActionStatus, string> = {
  proposed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  executing: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-500',
}

const actionTypeIcons: Partial<Record<AIActionType, React.ReactNode>> = {
  collection_reminder: <Clock className="h-4 w-4" />,
  cashflow_alert: <AlertTriangle className="h-4 w-4" />,
  margin_warning: <AlertTriangle className="h-4 w-4" />,
  risk_escalation: <ShieldCheck className="h-4 w-4" />,
  payment_schedule: <Zap className="h-4 w-4" />,
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'just now'
}

export default function FinancialActionQueue() {
  const { t } = useLocalization()
  const {
    pendingActions,
    recentActions,
    isLoading,
    approveAction,
    rejectAction,
  } = useFinancialActionQueue()
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending')

  const displayActions = activeTab === 'pending' ? pendingActions : recentActions

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('financial:actionQueue.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('financial:actionQueue.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-sm px-3 py-1">
              {pendingActions.length} {t('financial:actionQueue.pending')}
            </Badge>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('pending')}
        >
          <Clock className="mr-2 h-4 w-4" />
          {t('financial:actionQueue.pending')} ({pendingActions.length})
        </Button>
        <Button
          variant={activeTab === 'recent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('recent')}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t('financial:actionQueue.recent')} ({recentActions.length})
        </Button>
      </div>

      {/* Action Cards */}
      <div className="space-y-4" data-testid="action-queue-list">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p>{t('financial.loading')}</p>
            </CardContent>
          </Card>
        ) : displayActions.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="mb-1">{t('financial:actionQueue.noActions')}</p>
                <p className="text-sm">{t('financial:actionQueue.noActionsHint')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          displayActions.map(action => (
            <Card key={action.id} className="overflow-hidden">
              <div className="flex">
                {/* Left accent bar */}
                <div
                  className="w-1 shrink-0"
                  style={{
                    backgroundColor:
                      action.risk_level === 'critical' ? 'hsl(var(--destructive))'
                      : action.risk_level === 'high' ? 'hsl(30, 100%, 50%)'
                      : action.risk_level === 'medium' ? 'hsl(45, 93%, 47%)'
                      : 'hsl(var(--success))',
                  }}
                />
                <CardContent className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded bg-primary/10">
                          {actionTypeIcons[action.action_type] ?? <Bot className="h-4 w-4" />}
                        </div>
                        <h3 className="font-medium truncate">{action.title}</h3>
                        <Badge className={riskColors[action.risk_level]} variant="outline">
                          {t(`financial:riskLevels.${action.risk_level}`)}
                        </Badge>
                        <Badge className={statusColors[action.status]} variant="outline">
                          {t(`financial:actionQueue.statuses.${action.status}`)}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-2">{action.description}</p>

                      {/* Rationale */}
                      <div className="bg-muted/50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('financial:actionQueue.rationale')}
                        </p>
                        <p className="text-sm">{action.rationale}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {t(`financial:actionQueue.actionTypes.${action.action_type}`)}
                        </span>
                        <span>
                          {t('financial:actionQueue.confidence')}: {action.confidence.toFixed(0)}%
                        </span>
                        <span>
                          {t('financial:actionQueue.priority')}: {action.priority}
                        </span>
                        <span>{formatTimeAgo(action.proposed_at)}</span>
                        {action.expires_at && (
                          <span className="text-warning">
                            {t('financial:actionQueue.expiresAt')}: {formatTimeAgo(action.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (only for pending) */}
                    {action.status === 'proposed' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveAction.mutate(action.id)}
                          disabled={approveAction.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t('financial:actionQueue.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectAction.mutate({ actionId: action.id })}
                          disabled={rejectAction.isPending}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          {t('financial:actionQueue.reject')}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
