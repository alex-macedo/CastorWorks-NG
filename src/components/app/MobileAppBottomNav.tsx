/**
 * Mobile App Bottom Navigation
 * Adapted from castorworks-mobile-app/components/BottomNav.tsx
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type MobileScreen, SCREEN_ROUTES, ROUTE_SCREENS } from '@/types/mobileApp'

export function MobileAppBottomNav() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const location = useLocation()
  
  // Normalize pathname (remove trailing slash) and determine current screen
  const currentScreen = React.useMemo(() => {
    const normalizedPath = location.pathname.replace(/\/$/, '') || '/app'
    return ROUTE_SCREENS[normalizedPath] || 'DASHBOARD'
  }, [location.pathname])

  // Performance tracking ref
  const renderCounter = React.useRef({ count: 0, lastReset: 0 })

  // Development-only performance monitoring
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now()
      
      // Initialize timestamp on first run
      if (renderCounter.current.lastReset === 0) {
        renderCounter.current.lastReset = now
      }
      // Reset counter if more than 1s has passed
      if (now - renderCounter.current.lastReset > 1000) {
        renderCounter.current = { count: 0, lastReset: now }
      }
      
      renderCounter.current.count += 1
      
      // Warn if rendering more than 20 times per second (indicates potential loop)
      if (renderCounter.current.count > 20) {
        console.warn('⚠️ MobileAppBottomNav: High render rate detected (>20/sec)!', {
          count: renderCounter.current.count,
          pathname: location.pathname
        })
      }
    }
  })

  const navItems = [
    { id: 'DASHBOARD' as MobileScreen, icon: 'grid_view', labelKey: 'bottomNav.projects' },
    { id: 'TASKS' as MobileScreen, icon: 'assignment', labelKey: 'bottomNav.tasks' },
    { id: 'FINANCE' as MobileScreen, icon: 'account_balance_wallet', labelKey: 'bottomNav.finance' },
    { id: 'LOGS' as MobileScreen, icon: 'description', labelKey: 'bottomNav.logs' },
    { id: 'CONTACTS' as MobileScreen, icon: 'group', labelKey: 'bottomNav.team' },
  ]

  const handleNavigate = (screen: MobileScreen) => {
    navigate(SCREEN_ROUTES[screen])
  }

  // Determine if current screen is active or a child of a nav item
  const isActive = (itemId: MobileScreen) => {
    if (currentScreen === itemId) return true
    
    // Map child screens to their parent nav items
    const parentMappings: Record<MobileScreen, MobileScreen> = {
      PROJECT_CHAT: 'DASHBOARD',
      NOTIFICATIONS: 'DASHBOARD',
      BUILDER: 'TASKS',
      AGENDA_BUILDER: 'TASKS',
      LIVE_MEETING: 'TASKS',
      MEETING_REVIEW: 'TASKS',
      REPORT_PREVIEW: 'LOGS',
      ANNOTATIONS: 'LOGS',
      FINANCE_PROJECTION: 'FINANCE',
      BRANDING: 'CONTACTS',
      // These don't have parent mappings
      DASHBOARD: 'DASHBOARD',
      TASKS: 'TASKS',
      FINANCE: 'FINANCE',
      LOGS: 'LOGS',
      CONTACTS: 'CONTACTS',
      MOODBOARD: 'DASHBOARD',
      MEETING: 'TASKS',
      SHOPPING: 'FINANCE',
      FLOOR_PLAN: 'LOGS',
      MOODBOARD_CHAT: 'DASHBOARD',
      MOODBOARD_CONFIRMED: 'DASHBOARD',
      EMAIL_REVIEW: 'DASHBOARD',
    }
    
    return parentMappings[currentScreen] === itemId
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/95 backdrop-blur-md border-t border-white/10 flex justify-around items-center py-3 px-2 pb-8 z-[200] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const active = isActive(item.id)
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all py-1 min-w-[64px] ${
              active ? 'text-amber-500' : 'text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined !text-[24px] ${active ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold tracking-tight">{t(item.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
