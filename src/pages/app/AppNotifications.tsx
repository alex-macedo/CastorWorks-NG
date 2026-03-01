import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications, MobileNotification } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'unread' | 'critical'

function isCritical(n: MobileNotification) {
  return n.priority === 'high' || n.type === 'budget_overrun'
}

function getIcon(type: string) {
  switch (type) {
    case 'budget_overrun':
    case 'financial_alert':
    case 'payment_due':
    case 'payment_due_soon':
      return 'payments'
    case 'project_update':
      return 'sync'
    case 'schedule_change':
      return 'calendar_month'
    case 'material_delivery':
      return 'local_shipping'
    case 'task_due':
    case 'task_due_soon':
      return 'task_alt'
    case 'milestone_delay':
      return 'flag'
    case 'chat_message':
      return 'chat'
    case 'system':
      return 'info'
    default:
      return 'notifications'
  }
}

function getIconStyle(type: string, priority: string) {
  if (type === 'budget_overrun') return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (priority === 'high') return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  if (type === 'chat_message') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  if (type === 'project_update') return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  if (type === 'task_due' || type === 'task_due_soon') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  if (type === 'schedule_change') return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
  return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
}

function getActionLabel(n: MobileNotification, t: (k: string, fallback?: string) => string) {
  if (typeof n.data?.actionLabel === 'string') return n.data.actionLabel
  switch (n.type) {
    case 'budget_overrun': return t('notifications.actions.reviewBudget', 'Review Budget')
    case 'payment_due': return t('notifications.actions.payNow', 'Pay Now')
    case 'milestone_delay': return t('notifications.actions.viewSchedule', 'View Schedule')
    default: return t('notifications.actions.view', 'View')
  }
}

/** Map desktop notification action URLs to mobile app routes */
function toMobileActionUrl(url: string): string {
  if (!url || url.startsWith('/app')) return url
  if (url.startsWith('/architect/tasks')) return '/app/tasks'
  if (url.startsWith('/financial') || url.startsWith('/finance')) return '/app/finance'
  if (url.startsWith('/projects/') && url.includes('/schedule')) return '/app/daily-log'
  if (url.startsWith('/projects/')) return '/app'
  return url
}

export default function AppNotifications() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingRead,
    unreadCount,
    highPriorityCount,
  } = useNotifications(user?.id)

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'critical':
        return notifications.filter(isCritical)
      default:
        return notifications
    }
  }, [notifications, activeFilter])

  const todayNotifications = filteredNotifications.filter(n => {
    const created = new Date(n.created_at)
    const today = new Date()
    return created.toDateString() === today.toDateString()
  })

  const yesterdayNotifications = filteredNotifications.filter(n => {
    const created = new Date(n.created_at)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return created.toDateString() === yesterday.toDateString()
  })

  const olderNotifications = filteredNotifications.filter(n => {
    const created = new Date(n.created_at)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return (
      created.toDateString() !== today.toDateString() &&
      created.toDateString() !== yesterday.toDateString()
    )
  })

  const handleNotificationClick = (notification: MobileNotification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
    const actionUrl = notification.action_url ? toMobileActionUrl(notification.action_url) : null
    if (actionUrl) {
      navigate(actionUrl)
    }
  }

  const renderNotification = (notification: MobileNotification) => (
    <button
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      className={cn(
        "w-full bg-[#1a2632] rounded-2xl p-4 border transition-all text-left active:scale-[0.98]",
        notification.read ? "border-white/5" : "border-amber-400/20"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "size-11 rounded-xl flex items-center justify-center shrink-0 border",
          getIconStyle(notification.type, notification.priority)
        )}>
          <span className="material-symbols-outlined !text-xl">
            {getIcon(notification.type)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-sm">{notification.title}</h3>
            {notification.type === 'budget_overrun' && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider">
                {t('notifications.critical', 'Critical')}
              </span>
            )}
            {notification.priority === 'high' && notification.type !== 'budget_overrun' && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
                {t('notifications.urgent', 'Urgent')}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {notification.message}
          </p>

          {notification.action_url && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5 text-orange-400">
                <span className="text-sm font-bold">!</span>
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {t('notifications.requiresAction', 'Requires Action')}
                </span>
              </div>
              <span className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold uppercase tracking-wider">
                {getActionLabel(notification, t)}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] text-slate-500 font-medium">
            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {!notification.read && (
            <span className="inline-block size-2 bg-amber-400 rounded-full mt-2" />
          )}
        </div>
      </div>
    </button>
  )

  if (isLoading) {
    return (
      <MobileAppLayout>
        <div className="bg-black min-h-screen text-white font-sans flex items-center justify-center">
          <div className="text-center">
            <div className="size-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </MobileAppLayout>
    )
  }

  return (
    <MobileAppLayout>
      <div className="bg-black min-h-screen text-white font-sans">
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center text-slate-400"
              aria-label={t('common.back', 'Back')}
            >
              <span className="material-symbols-outlined !text-2xl">chevron_left</span>
            </button>

            <h1 className="text-lg font-bold">{t('notifications.appTitle', 'Notifications')}</h1>

            <button
            onClick={() => markAllAsRead.mutate()}
            disabled={isMarkingRead || unreadCount === 0}
            className="text-amber-400 text-sm font-bold px-3 py-1 rounded-lg border border-amber-400/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isMarkingRead ? t('notifications.clearing', 'Clearing...') : t('notifications.clear', 'Clear')}
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
              activeFilter === 'all'
                ? "bg-amber-400 text-black"
                : "bg-white/5 text-slate-400 border border-white/10"
            )}
          >
            {t('notifications.all', 'All')}
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
              activeFilter === 'unread'
                ? "bg-amber-400 text-black"
                : "bg-white/5 text-slate-400 border border-white/10"
            )}
          >
            {t('notifications.unread', 'Unread')}
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
              activeFilter === 'critical'
                ? "bg-amber-400 text-black"
                : "bg-white/5 text-slate-400 border border-white/10"
            )}
          >
            <span className="size-1.5 rounded-full bg-red-500" />
            {t('notifications.critical', 'Critical')}
            {highPriorityCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                activeFilter === 'critical' ? "bg-black/20 text-black" : "bg-red-500/20 text-red-400"
              )}>
                {highPriorityCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 pb-32">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500 !text-3xl">notifications_off</span>
            </div>
            <h3 className="text-lg font-bold mb-1">{t('notifications.empty', 'No notifications')}</h3>
            <p className="text-sm text-slate-500">{t('notifications.allCaughtUp', "You're all caught up!")}</p>
          </div>
        ) : (
          <>
            {todayNotifications.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t('notifications.today', 'Today')}</p>
                {todayNotifications.map(renderNotification)}
              </div>
            )}

            {yesterdayNotifications.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-6">{t('notifications.yesterday', 'Yesterday')}</p>
                {yesterdayNotifications.map(renderNotification)}
              </div>
            )}

            {olderNotifications.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-6">{t('notifications.older', 'Older')}</p>
                {olderNotifications.map(renderNotification)}
              </div>
            )}
          </>
        )}
      </main>
      </div>
    </MobileAppLayout>
  )
}
