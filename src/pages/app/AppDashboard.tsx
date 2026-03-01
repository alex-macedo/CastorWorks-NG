import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useOptimizedProjects } from '@/hooks/useOptimizedProjects'
import { useMilestones } from '@/hooks/useMilestones'
import { useFinancialEntries } from '@/hooks/useFinancialEntries'
import { resolveStorageUrl } from '@/utils/storage'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus'
import { getScheduleStatusTranslationKey } from '@/utils/badgeVariants'

const MOCK_PORTFOLIO = [
  { 
    id: 'mock-1', 
    name: 'Skyline Pavilion', 
    progress: 85, 
    status: 'in_progress',
    cover_image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop'
  },
  { 
    id: 'mock-2', 
    name: 'Stone Creek Residence', 
    progress: 40, 
    status: 'planning',
    cover_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop'
  },
]

const MOCK_FINANCIAL_STATS = [15, 25, 20, 35, 30, 65, 95, 45, 60]

const ProgressRing = ({ progress, size = 80 }: { progress: number; size?: number }) => {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative flex items-center justify-center ${size === 80 ? 'size-20' : 'size-16'}`}>
      <svg className="size-full -rotate-90">
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          className="stroke-white/5" 
          strokeWidth={strokeWidth} 
          fill="none" 
        />
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          className="stroke-amber-400 drop-shadow-lg" 
          strokeWidth={strokeWidth} 
          fill="none" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-black text-white">{progress}%</span>
    </div>
  )
}

export default function AppDashboard() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const [projectImageUrls, setProjectImageUrls] = useState<Record<string, string>>({})

  const projectOptions = React.useMemo(() => ({ 
    limit: 20,
    includePhases: true 
  }), [])

  const { data: projectsData, isLoading: projectsLoading } = useOptimizedProjects(projectOptions)
  const projects = React.useMemo(() => projectsData?.data || [], [projectsData])
  
  const activeProjects = React.useMemo(() => {
    return projects.filter((p: any) => 
      p.status === 'in_progress' || p.status === 'active' || p.status === 'planning'
    )
  }, [projects])
  
  const firstProjectId = activeProjects[0]?.id
  const { milestones = [], isLoading: milestonesLoading } = useMilestones(firstProjectId)
  const upcomingMilestones = milestones
    ?.filter((m: any) => m.status === 'pending' || m.status === 'in_progress')
    ?.slice(0, 3) || []

  const { financialEntries = [] } = useFinancialEntries()
  
  const monthlyRevenue = React.useMemo(() => {
    if (!financialEntries || financialEntries.length === 0) return 42850
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    
    const total = financialEntries
      .filter((entry: any) => {
        const entryDate = parseISO(entry.date)
        return entry.entry_type === 'income' && 
               entryDate >= monthStart && 
               entryDate <= monthEnd
      })
      .reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
    
    return total > 0 ? total : 42850
  }, [financialEntries])

  const revenueChart = React.useMemo(() => {
    if (!financialEntries || financialEntries.length === 0) return MOCK_FINANCIAL_STATS
    
    const now = new Date()
    const months: number[] = []
    
    for (let i = 8; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthTotal = financialEntries
        .filter((entry: any) => {
          const entryDate = parseISO(entry.date)
          return entry.entry_type === 'income' &&
                 entryDate >= monthDate &&
                 entryDate <= monthEndDate
        })
        .reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
      
      months.push(monthTotal)
    }
    
    const maxValue = Math.max(...months, 1)
    const normalized = months.map(v => Math.round((v / maxValue) * 100) || 5)
    
    if (normalized.every(v => v <= 5)) return MOCK_FINANCIAL_STATS
    return normalized
  }, [financialEntries])

  const getProjectProgress = (project: any): number => {
    if (project.project_phases && project.project_phases.length > 0) {
      const totalProgress = project.project_phases.reduce(
        (sum: number, phase: any) => sum + (phase.progress_percentage || 0), 
        0
      )
      return Math.round(totalProgress / project.project_phases.length)
    }
    return project.progress || 0
  }

  const getStatusTag = (project: { schedule_status?: string | null; status?: string | null }): string => {
    const scheduleStatus = getProjectScheduleStatus(project)
    return t(getScheduleStatusTranslationKey(scheduleStatus))
  }

  const getProjectImageUrl = useCallback(async (project: any): Promise<string> => {
    if (!project.image_url || project.image_url === '/placeholder.svg' || project.image_url.includes('placeholder')) {
      return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
    }

    if (project.image_url.startsWith('http')) {
      return project.image_url
    }

    try {
      return await resolveStorageUrl(project.image_url, 60 * 60 * 24 * 365)
    } catch {
      return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
    }
  }, [])

  useEffect(() => {
    if (!activeProjects.length) return

    const loadImages = async () => {
      const updates: Record<string, string> = {}
      let hasUpdates = false

      const projectsToLoad = activeProjects.filter(p => p.image_url && !projectImageUrls[p.id])
      
      if (projectsToLoad.length === 0) return

      await Promise.all(projectsToLoad.map(async (project) => {
        try {
          const url = await getProjectImageUrl(project)
          updates[project.id] = url
          hasUpdates = true
        } catch (err) {
          console.error(`Failed to load image for project ${project.id}`, err)
        }
      }))

      if (hasUpdates) {
        setProjectImageUrls(prev => ({ ...prev, ...updates }))
      }
    }
    
    loadImages()
  }, [activeProjects, getProjectImageUrl, projectImageUrls])

  const portfolioProjects = activeProjects.length > 0 ? activeProjects : MOCK_PORTFOLIO

  const reportProgress = 70

  return (
    <MobileAppLayout>
      <div className="bg-black text-white min-h-full pb-32 font-sans space-y-6 px-4 pt-4">
        {/* Automated Dispatch Card */}
        <section className="bg-gradient-to-br from-[#121619] to-[#0A0D0F] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 !text-[18px]">auto_awesome</span>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
                  {t('automatedDispatch', 'Automated Dispatch')}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight leading-tight">
                {t('weeklyProgressReport', 'Weekly Progress Report')}
              </h2>
              
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  {t('recipient', 'Recipient')}
                </p>
                <p className="text-sm font-semibold text-slate-200">
                  Sarah Jenkins • Lead Investor
                </p>
              </div>

              <div className="space-y-0.5 pt-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  {t('sendingIn', 'Sending in')}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-light">3</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">
                    {t('days', 'Days')}
                  </span>
                  <span className="text-2xl font-light">4</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {t('hours', 'Hours')}
                  </span>
                </div>
              </div>
            </div>

            <ProgressRing progress={reportProgress} />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8 relative z-10">
            <button 
              onClick={() => navigate('/app/meeting')}
              className="h-12 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined !text-lg text-slate-400">visibility</span>
              {t('preview', 'Preview')}
            </button>
            <button className="h-12 bg-amber-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined !text-lg">send</span>
              {t('sendNow', 'Send Now')}
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#121619] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
            <span className="material-symbols-outlined text-amber-400 !text-2xl">architecture</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {t('activeProjects', 'Active Projects')}
              </p>
              <h3 className="text-3xl font-light tracking-tight">
                {projectsLoading ? '...' : activeProjects.length || 12}
              </h3>
            </div>
          </div>
          <div className="bg-[#121619] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
            <span className="material-symbols-outlined text-amber-400 !text-2xl">payments</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {t('billableHours', 'Billable Hours')}
              </p>
              <h3 className="text-3xl font-light tracking-tight">164.5</h3>
            </div>
          </div>
        </div>

        {/* Current Portfolio */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold tracking-tight">
              {t('currentPortfolio', 'Current Portfolio')}
            </h3>
            <button 
              onClick={() => navigate('/projects')}
              className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]"
            >
              {t('viewAll', 'View All')}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {portfolioProjects.map((project: any) => {
              const progress = getProjectProgress(project)
              const statusTag = getStatusTag(project)
              const imageUrl = projectImageUrls[project.id] || project.cover_image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
              return (
                <div 
                  key={project.id} 
                  className="w-[308px] min-w-[308px] space-y-2 shrink-0"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/5 shadow-xl bg-[#121619]">
                    <img 
                      src={imageUrl} 
                      className="size-full object-cover" 
                      alt={project.name}
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-black text-amber-400 border border-amber-400/30 uppercase tracking-widest">
                      {statusTag}
                    </div>
                  </div>
                  <div className="px-0.5 space-y-1.5">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="text-[14px] font-bold tracking-tight truncate">{project.name}</h4>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider shrink-0">
                        {t('percentComplete', { percent: progress })}% Complete
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Studio Tools */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight px-1">
            {t('studioTools', 'Studio Tools')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/app/daily-log')} 
              className="bg-[#121619] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-4 shadow-xl active:scale-95 transition-all"
            >
              <div className="size-11 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
                <span className="material-symbols-outlined !text-xl">description</span>
              </div>
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em]">
                {t('dailyLog.title', 'Daily Log')}
              </span>
            </button>
            <button 
              onClick={() => navigate('/app/meeting')} 
              className="bg-[#121619] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-4 shadow-xl active:scale-95 transition-all"
            >
              <div className="size-11 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
                <span className="material-symbols-outlined !text-xl">psychology</span>
              </div>
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em]">
                {t('aiInsight', 'AI Insight')}
              </span>
            </button>
          </div>
        </section>

        {/* Milestones */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold tracking-tight">
              {t('milestones', 'Milestones')}
            </h3>
            <button className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
              {t('timeline', 'Timeline')}
            </button>
          </div>
          {milestonesLoading ? (
            <div className="bg-[#121619] border border-white/5 rounded-3xl p-6 flex items-center justify-center">
              <div className="size-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : upcomingMilestones.length > 0 ? (
            upcomingMilestones.map((milestone: any) => {
              const dueDate = milestone.due_date ? parseISO(milestone.due_date) : new Date()
              return (
                <div 
                  key={milestone.id}
                  className="bg-[#121619] border border-white/5 rounded-3xl p-4 flex items-center gap-4 shadow-xl"
                >
                  <div className="bg-black border border-white/5 rounded-2xl p-2.5 flex flex-col items-center min-w-[54px]">
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">
                      {format(dueDate, 'MMM')}
                    </span>
                    <span className="text-xl font-light text-white">{format(dueDate, 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-bold tracking-tight truncate text-white">{milestone.name}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">
                      {activeProjects[0]?.name || 'Project'} • {milestone.time || '10:00 AM'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                </div>
              )
            })
          ) : (
            <div 
              className="bg-[#121619] border border-white/5 rounded-3xl p-4 flex items-center gap-4 shadow-xl"
            >
              <div className="bg-black border border-white/5 rounded-2xl p-2.5 flex flex-col items-center min-w-[54px]">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">Oct</span>
                <span className="text-xl font-light text-white">24</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-bold tracking-tight truncate text-white">Site Inspection</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">
                  Skyline Pavilion • 10:00 AM
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-600">chevron_right</span>
            </div>
          )}
        </section>

        {/* Financial Health */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight px-1">
            {t('financialHealth', 'Financial Health')}
          </h3>
          <div className="bg-[#121619] border border-white/5 rounded-[2rem] p-7 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('monthlyRevenue', 'Monthly Revenue')}
                </p>
                <h3 className="text-3xl font-light tracking-tight text-white">
                  ${monthlyRevenue.toLocaleString()}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500">
                <span className="material-symbols-outlined !text-sm font-black">trending_up</span>
                <span className="text-[10px] font-black">12%</span>
              </div>
            </div>

            <div className="h-24 w-full flex items-end gap-1.5 relative z-10">
              {revenueChart.map((h, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 rounded-t-sm transition-all duration-700",
                    i === 6 ? "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]" : "bg-white/5"
                  )}
                  style={{ height: `${h}%` } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </MobileAppLayout>
  )
}
