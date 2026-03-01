import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  ShieldAlert, 
  Wallet,
  ArrowRight,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'
import { useFinancialCashflowForecast } from '@/hooks/useFinancialCashflowForecast'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function FinancialExecutiveOverview() {
  const { t, currency } = useLocalization()
  const navigate = useNavigate()
  const { forecast, isLoading } = useFinancialCashflowForecast()
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading || !forecast) return null

  const currentBalance = forecast.currentBalance
  const minBalance = forecast.lowestProjectedBalance
  const isHealthy = currentBalance > 0 && minBalance > 0
  const riskCount = forecast.weeks.filter(w => w.riskLevel === 'high' || w.riskLevel === 'critical').length

  const chartData = forecast.weeks.map(w => ({
    name: w.weekLabel,
    balance: Number(w.projectedBalance)
  }))

  return (
    <Card className="rounded-tl-0 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-border/50 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
      <CardHeader className={cn("pb-2", !isExpanded && "pb-4")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className={cn("h-5 w-5", riskCount > 0 ? 'text-destructive' : 'text-primary')} />
              {t('dashboard:financialOverview.title')}
            </CardTitle>
            {isExpanded && (
              <CardDescription className="text-sm text-muted-foreground">
                {t('dashboard:financialOverview.subtitle')}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/finance/cashflow')}
                className="h-8 text-xs font-semibold"
              >
                {t('common:viewDetails')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(prev => !prev)}
              aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
      <CardContent>
        <div className="grid gap-6 md:grid-cols-12">
          {/* Main Balance & Sparkline */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t('dashboard:financialOverview.currentCashPosition')}
                </p>
                <div className="flex items-center gap-3">
                  <p className={cn("text-3xl font-bold tracking-tight", currentBalance < 0 ? 'text-red-600' : 'text-foreground')}>
                    {formatCurrency(currentBalance, currency)}
                  </p>
                  <Badge variant={isHealthy ? 'secondary' : 'destructive'} className="h-6 px-2 rounded-md font-bold text-[10px] uppercase border-none">
                    {isHealthy ? (
                      <><TrendingUp className="mr-1 h-3 w-3" /> {t('dashboard:financialOverview.statusStable')}</>
                    ) : (
                      <>{t('dashboard:financialOverview.statusRisk')}</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-bold">{payload[0].payload.name}</p>
                            <p className="text-blue-600 font-bold">{formatCurrency(Number(payload[0].value), currency)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorBal)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 text-center">
              {t('dashboard:financialOverview.outlookWeeks', { count: 13 })}
            </p>
          </div>

          {/* Key Insights List */}
          <div className="md:col-span-4 space-y-3 pt-4 border-t md:border-t-0 md:border-l border-border/50 md:pl-6">
            <div className="space-y-1">
               <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                 {t('dashboard:financialOverview.riskAssessment')}
               </p>
               <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-border/40 shadow-sm">
                 <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                   <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <Target className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                   </div>
                   {t('dashboard:financialOverview.criticalWeeks')}
                 </span>
                 <span className={cn("text-lg font-bold", riskCount > 0 ? 'text-red-600' : 'text-green-600')}>
                   {riskCount}
                 </span>
               </div>
            </div>

            <div className="space-y-1">
               <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                 {t('dashboard:financialOverview.collectionPower')}
               </p>
               <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-border/40 shadow-sm">
                 <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                   <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                   </div>
                   {t('dashboard:financialOverview.collectionRate')}
                 </span>
                 <span className="text-lg font-bold text-blue-600">82%</span>
               </div>
            </div>

            <div className="pt-2">
               <Button variant="outline" size="sm" className="w-full text-[10px] uppercase font-bold tracking-wider h-9 border-border/60 hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => navigate('/financial/collections')}>
                 {t('dashboard:financialOverview.manageCollections')}
               </Button>
            </div>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  )
}
