import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { MobileAppSidebar } from './MobileAppSidebar'
import { MobileAppBottomNav } from './MobileAppBottomNav'
import { MobileTopNav } from './MobileTopNav'
import { MobileProjectSelector } from './MobileProjectSelector'

interface MobileAppLayoutProps {
  children: React.ReactNode
  /** Full immersion mode - only shows sidebar button, no bottom nav */
  fullImmersion?: boolean
  /** Custom header - if true, don't render default header */
  customHeader?: boolean
  /** Show project selector below top nav (for all pages except Dashboard) */
  showProjectSelector?: boolean
  /** Disable wrapper scrolling when page handles its own scroll */
  disableMainScroll?: boolean
}

export function MobileAppLayout({
  children,
  fullImmersion = false,
  customHeader = false,
  showProjectSelector = false,
  disableMainScroll = false,
}: MobileAppLayoutProps) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans overflow-x-hidden">
      {/* Sidebar */}
      <MobileAppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      {!customHeader && (
        <MobileTopNav onOpenSidebar={() => setSidebarOpen(true)} />
      )}

      {/* Project Selector */}
      {showProjectSelector && !customHeader && (
        <MobileProjectSelector />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        disableMainScroll ? "overflow-hidden" : "overflow-y-auto",
        !fullImmersion && "pb-[calc(4rem+1rem)]"
      )}>
        {children}
      </main>

      {/* Bottom Navigation - Hidden in full immersion mode */}
      {!fullImmersion && <MobileAppBottomNav />}

      {/* Floating sidebar button for full immersion mode */}
      {fullImmersion && !customHeader && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 size-11 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-amber-400">menu</span>
        </button>
      )}
    </div>
  )
}
