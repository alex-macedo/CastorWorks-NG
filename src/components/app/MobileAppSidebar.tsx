/**
 * Mobile App Sidebar
 * Adapted from castorworks-mobile-app/components/Sidebar.tsx
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type MobileScreen, SCREEN_ROUTES, ROUTE_SCREENS } from '@/types/mobileApp'
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileAppSidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('app')
  const { data: currentUser } = useCurrentUserProfile()
  
  // User info from profile
  const userName = currentUser?.display_name || 'CastorWorks User'
  const userAvatar = currentUser?.avatar_url
  const userRole = t('studioPrincipal', 'Studio Principal')
  
  // Determine current screen from route
  const currentScreen = ROUTE_SCREENS[location.pathname] || 'DASHBOARD'

  const handleNavigate = (screen: MobileScreen) => {
    navigate(SCREEN_ROUTES[screen])
    onClose()
  }

  // Full menu structure per design specifications - labels use i18n
  const menuGroups = [
    {
      titleKey: 'navigation.sidebar.groups.principalSuite',
      items: [
        { id: 'DASHBOARD' as MobileScreen, labelKey: 'navigation.sidebar.items.dashboard', icon: 'grid_view' },
        { id: 'NOTIFICATIONS' as MobileScreen, labelKey: 'navigation.sidebar.items.notifications', icon: 'notifications' },
        { id: 'PROJECT_CHAT' as MobileScreen, labelKey: 'navigation.sidebar.items.projectChat', icon: 'chat' },
        { id: 'EMAIL_REVIEW' as MobileScreen, labelKey: 'navigation.sidebar.items.emailReview', icon: 'mark_email_read' },
        { id: 'CONTACTS' as MobileScreen, labelKey: 'navigation.sidebar.items.contacts', icon: 'contacts' },
      ]
    },
    {
      titleKey: 'navigation.sidebar.groups.siteVault',
      items: [
        { id: 'LOGS' as MobileScreen, labelKey: 'navigation.sidebar.items.logs', icon: 'assignment' },
        { id: 'FINANCE' as MobileScreen, labelKey: 'navigation.sidebar.items.finance', icon: 'account_balance_wallet' },
        { id: 'FINANCE_PROJECTION' as MobileScreen, labelKey: 'navigation.sidebar.items.projections', icon: 'query_stats' },
        { id: 'REPORT_PREVIEW' as MobileScreen, labelKey: 'navigation.sidebar.items.reports', icon: 'summarize' },
      ]
    },
    {
      titleKey: 'navigation.sidebar.groups.designStudio',
      items: [
        { id: 'MOODBOARD' as MobileScreen, labelKey: 'navigation.sidebar.items.moodboards', icon: 'palette' },
        { id: 'FLOOR_PLAN' as MobileScreen, labelKey: 'navigation.sidebar.items.floorPlans', icon: 'floor' },
        { id: 'ANNOTATIONS' as MobileScreen, labelKey: 'navigation.sidebar.items.annotations', icon: 'edit_note' },
        { id: 'SHOPPING' as MobileScreen, labelKey: 'navigation.sidebar.items.procurement', icon: 'shopping_cart' },
      ]
    },
    {
      titleKey: 'navigation.sidebar.groups.projectExecution',
      items: [
        { id: 'BUILDER' as MobileScreen, labelKey: 'navigation.sidebar.items.projectArchitect', icon: 'construction' },
        { id: 'TASKS' as MobileScreen, labelKey: 'navigation.sidebar.items.taskMomentum', icon: 'checklist' },
        { id: 'AGENDA_BUILDER' as MobileScreen, labelKey: 'navigation.sidebar.items.meetingAgendas', icon: 'event_note' },
        { id: 'MEETING_REVIEW' as MobileScreen, labelKey: 'navigation.sidebar.items.meetingReview', icon: 'rate_review' },
      ]
    },
    {
      titleKey: 'navigation.sidebar.groups.system',
      items: [
        { id: 'BRANDING' as MobileScreen, labelKey: 'navigation.sidebar.items.studioIdentity', icon: 'settings' },
      ]
    },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in" onClick={onClose} />
      <div className="relative w-full sm:w-85 max-w-[100vw] bg-black h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 border-r border-white/5">
        <div className="p-6 pt-12 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined font-black !text-[28px]">architecture</span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Studio Menu</h2>
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] -mt-0.5">CastorWorks</p>
            </div>
          </div>
          <button onClick={onClose} className="size-11 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined !text-[28px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 py-8 space-y-10">
          {menuGroups.map((group) => (
            <div key={group.titleKey} className="space-y-4">
              <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-2">
                <span className="h-px w-4 bg-slate-800"></span>
                {t(group.titleKey)}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${
                      currentScreen === item.id 
                        ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20 shadow-lg shadow-amber-500/5' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${currentScreen === item.id ? 'bg-amber-500/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
                      <span className={`material-symbols-outlined !text-[22px] ${currentScreen === item.id ? 'fill-1' : ''}`}>
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[15px] font-bold tracking-tight">{t(`${item.labelKey}.label`)}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-widest ${currentScreen === item.id ? 'text-amber-500/60' : 'text-slate-600'}`}>{t(`${item.labelKey}.sub`)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="h-10"></div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 pb-12">
          <div className="flex items-center gap-4">
            <div className="relative">
              {userAvatar ? (
                <img src={userAvatar} className="size-12 rounded-full border border-amber-500/30 p-0.5 object-cover" alt="" />
              ) : (
                <div className="size-12 rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full border-2 border-black"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate text-white">{userName}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{userRole}</p>
            </div>
            <button className="size-11 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined !text-[22px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
