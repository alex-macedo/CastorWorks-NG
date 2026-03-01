/**
 * Mobile App Top Navigation
 * Reusable top navigation bar for all mobile app screens
 * Standard layout: [Menu] [Avatar] [User Info] ... [Search]
 * Floating notification bell positioned below the nav bar
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'

interface MobileTopNavProps {
  onOpenSidebar: () => void
}

export function MobileTopNav({ onOpenSidebar }: MobileTopNavProps) {
  const navigate = useNavigate()
  const { t } = useLocalization()
  const { user } = useAuth()
  const { data: currentUser } = useCurrentUserProfile()
  const { unreadCount } = useNotifications(user?.id)

  // User info from profile
  const userName = currentUser?.display_name || 'CastorWorks User'
  const userAvatar = currentUser?.avatar_url

  return (
    <>
      {/* Top Bar - Sticky */}
      <header className="sticky top-0 z-50 shrink-0 p-4 flex items-center justify-between bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenSidebar} 
            className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-amber-400">menu</span>
          </button>
          <div className="size-11 rounded-full overflow-hidden border-2 border-amber-400/30 flex items-center justify-center">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {t('app.studioPrincipal', 'Studio Principal')}
            </span>
            <h1 className="text-base font-bold tracking-tight">{userName}</h1>
          </div>
        </div>
        <button className="size-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-400 !text-xl">search</span>
        </button>
      </header>

      {/* Floating Notification Bell */}
      <button 
        onClick={() => navigate('/app/notifications')} 
        className="fixed top-20 right-4 z-40 size-12 rounded-full bg-[#121619] border border-white/10 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        aria-label={t('notifications.appTitle', 'Notifications')}
      >
        <span className="material-symbols-outlined text-amber-400 !text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-amber-400 text-black text-[10px] font-black rounded-full border-2 border-[#121619] shadow-[0_0_8px_rgba(251,191,36,0.5)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </>
  )
}
