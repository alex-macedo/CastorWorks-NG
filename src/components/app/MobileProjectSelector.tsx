import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppProject } from '@/contexts/AppProjectContext'
import { cn } from '@/lib/utils'

export function MobileProjectSelector() {
  const { selectedProject, setSelectedProject, projects, isLoading } = useAppProject()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen])

  if (isLoading) {
    return (
      <div className="px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    )
  }

  // Don't show if no projects available
  if (projects.length === 0) {
    return null
  }

  // Dropdown content - rendered via portal
  const dropdownContent = isOpen && projects.length > 1 ? createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dropdown Menu */}
      <div 
        className="absolute bg-[#1a2632] rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        <div className="p-3 border-b border-white/10 bg-[#0f1419]">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            Switch Project
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-hide">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedProject(project)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 transition-colors border-b border-white/5 last:border-0",
                selectedProject?.id === project.id 
                  ? "bg-amber-400/10" 
                  : "hover:bg-white/5 active:bg-white/10"
              )}
            >
              {/* Thumbnail */}
              {project.cover_image_url ? (
                <img 
                  src={project.cover_image_url} 
                  className="size-10 rounded-xl object-cover border border-white/10 shrink-0" 
                  alt="" 
                />
              ) : (
                <div className="size-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-400 !text-lg">apartment</span>
                </div>
              )}
              
              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <p className={cn(
                  "font-semibold text-sm truncate",
                  selectedProject?.id === project.id ? "text-amber-400" : "text-white"
                )}>
                  {project.name}
                </p>
                <p className="text-slate-500 text-xs truncate">
                  {project.address || 'No address'}
                </p>
              </div>

              {/* Selected Check */}
              {selectedProject?.id === project.id && (
                <span className="material-symbols-outlined !text-lg text-amber-400">check_circle</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <button
        ref={buttonRef}
        onClick={() => projects.length > 1 && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 p-3 bg-[#1a2632] rounded-2xl border active:scale-[0.98] transition-transform",
          projects.length > 1 ? "border-amber-400/30" : "border-white/5"
        )}
      >
        {/* Project Icon */}
        <div className="size-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-amber-400 !text-xl">apartment</span>
        </div>
        
        {/* Project Info */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {selectedProject?.name || 'Select Project'}
          </p>
          <p className="text-slate-500 text-xs truncate">
            {projects.length > 1 ? `${projects.length} projects available` : 'Current project'}
          </p>
        </div>

        {/* Notification Bell Icon */}
        <div className="size-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-black !text-lg">notifications</span>
        </div>
      </button>

      {/* Render dropdown via portal */}
      {dropdownContent}
    </div>
  )
}
