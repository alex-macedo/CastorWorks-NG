import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useTimelineAnalytics, type TimelineAnalytics } from '@/hooks/useTimelineAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock, MessageSquare, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DelayAnalyticsCardProps {
  projectId: string | undefined
  className?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

/**
 * DelayAnalyticsCard Component
 * Displays comprehensive timeline analytics including milestone stats, delays, and performance trends
 */
export const DelayAnalyticsCard: React.FC<DelayAnalyticsCardProps> = ({ 
  projectId, 
  className 
}) => {
  const { t } = useLocalization()
  const { data: analytics, isLoading } = useTimelineAnalytics(projectId)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading || !analytics) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            {t('timeline.analytics.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-64 items-center justify-center text-muted-foreground'>
            {t('timeline.analytics.loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { milestoneStats, delayStats, phaseStats, engagementStats, performanceTrends } = analytics

  // Prepare data for charts
  const statusData = [
    { name: t('timeline.analytics.completed'), value: milestoneStats.completed, color: '#00C49F' },
    { name: t('timeline.analytics.pending'), value: milestoneStats.pending, color: '#FFBB28' },
    { name: t('timeline.analytics.delayed'), value: milestoneStats.delayed, color: '#FF8042' }
  ]

  const phaseDelayData = Object.entries(delayStats.delaysByPhase).map(([phase, count]) => ({
    phase,
    delays: count
  }))

  const engagementData = [
    { 
      metric: t('timeline.analytics.milestonesWithComments'), 
      value: engagementStats.milestonesWithComments 
    },
    { 
      metric: t('timeline.analytics.totalComments'), 
      value: engagementStats.totalComments 
    }
  ]

  return (
    <Card className={cn('flex h-full min-h-0 flex-col', className)}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-sm'>
            <TrendingUp className='h-5 w-5' />
            {t('timeline.analytics.title')}
          </CardTitle>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setIsExpanded(!isExpanded)}
            className='h-8 w-8 p-0'
          >
            {isExpanded ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className='min-h-0 flex-1 overflow-hidden p-3 pt-0'>
        <div className='h-full overflow-y-auto pr-1'>
          <div className='space-y-6'>
            {/* Key Metrics Summary */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='flex flex-col items-center space-y-1 rounded-lg border p-3'>
            <CheckCircle className='h-8 w-8 text-green-600' />
            <div className='text-center'>
              <p className='text-2xl font-bold'>{milestoneStats.completionRate.toFixed(1)}%</p>
              <p className='text-xs text-muted-foreground'>{t('timeline.analytics.completionRate')}</p>
            </div>
          </div>
          
          <div className='flex flex-col items-center space-y-1 rounded-lg border p-3'>
            <Clock className='h-8 w-8 text-amber-600' />
            <div className='text-center'>
              <p className='text-2xl font-bold'>{delayStats.averageDelayDays.toFixed(1)}</p>
              <p className='text-xs text-muted-foreground'>{t('timeline.analytics.averageDelay')}</p>
            </div>
          </div>
          
          <div className='flex flex-col items-center space-y-1 rounded-lg border p-3'>
            <MessageSquare className='h-8 w-8 text-blue-600' />
            <div className='text-center'>
              <p className='text-2xl font-bold'>{engagementStats.totalComments}</p>
              <p className='text-xs text-muted-foreground'>{t('timeline.analytics.totalComments')}</p>
            </div>
          </div>
          
          <div className='flex flex-col items-center space-y-1 rounded-lg border p-3'>
            <TrendingUp className='h-8 w-8 text-purple-600' />
            <div className='text-center'>
              <p className='text-2xl font-bold'>{phaseStats.completed}</p>
              <p className='text-xs text-muted-foreground'>{t('timeline.analytics.phasesCompleted')}</p>
            </div>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Milestone Status Chart */}
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold'>{t('timeline.analytics.milestoneStatusBreakdown')}</h3>
              <div className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill='#8884d8'
                      dataKey='value'
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Delays by Phase Chart */}
            {phaseDelayData.length > 0 && (
              <div className='space-y-3'>
                <h3 className='text-sm font-semibold'>{t('timeline.analytics.delaysByPhase')}</h3>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={phaseDelayData}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis 
                        dataKey='phase' 
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey='delays' fill='#FF8042' />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Performance Trends */}
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold'>{t('timeline.analytics.performanceTrends')}</h3>
              <div className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={performanceTrends}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='period' />
                    <YAxis yAxisId='left' />
                    <YAxis yAxisId='right' orientation='right' />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId='left'
                      type='monotone'
                      dataKey='completionRate'
                      stroke='#00C49F'
                      strokeWidth={2}
                      name={t('timeline.analytics.completionRate')}
                    />
                    <Line
                      yAxisId='right'
                      type='monotone'
                      dataKey='averageDelay'
                      stroke='#FF8042'
                      strokeWidth={2}
                      name={t('timeline.analytics.averageDelay')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Delay Details */}
              <div className='space-y-3 rounded-lg border p-4'>
                <h4 className='text-sm font-semibold'>{t('timeline.analytics.delayDetails')}</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span>{t('timeline.analytics.totalDelays')}:</span>
                    <Badge variant='destructive'>{delayStats.totalDelays}</Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('timeline.analytics.totalDelayDays')}:</span>
                    <Badge variant='destructive'>{delayStats.totalDelayDays}</Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('timeline.analytics.mostCommonCause')}:</span>
                    <span className='text-xs font-medium'>{delayStats.mostCommonCause}</span>
                  </div>
                </div>
              </div>

              {/* Engagement Details */}
              <div className='space-y-3 rounded-lg border p-4'>
                <h4 className='text-sm font-semibold'>{t('timeline.analytics.engagementDetails')}</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span>{t('timeline.analytics.milestonesWithComments')}:</span>
                    <Badge variant='secondary'>{engagementStats.milestonesWithComments}</Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('timeline.analytics.averageCommentsPerMilestone')}:</span>
                    <Badge variant='secondary'>{engagementStats.averageCommentsPerMilestone.toFixed(1)}</Badge>
                  </div>
                  {engagementStats.mostActiveMilestone && (
                    <div className='flex justify-between'>
                      <span>{t('timeline.analytics.mostActiveMilestone')}:</span>
                      <span className='text-xs font-medium truncate max-w-24' title={engagementStats.mostActiveMilestone}>
                        {engagementStats.mostActiveMilestone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
