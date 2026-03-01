/**
 * Mobile App Bottom Navigation
 * Reusable bottom navigation bar for all mobile app screens
 * 7-item layout: Dashboard | Tasks | Chat | Annotations | Moodboard | Contacts | More
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/app', icon: 'grid_view', label: 'Dash' },
  { path: '/app/tasks', icon: 'checklist', label: 'Tasks' },
  { path: '/app/chat', icon: 'chat', label: 'Chat' },
  { path: '/app/annotations', icon: 'pin_drop', label: 'Annot' },
  { path: '/app/moodboard', icon: 'dashboard', label: 'Mood' },
  { path: '/app/contacts', icon: 'people', label: 'Contacts' },
  { path: '/app/settings', icon: 'settings', label: 'Settings' },
]

export function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/5">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isActive(item.path) ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined !text-xl ${isActive(item.path) ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
