import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useOptimizedProjects } from '@/hooks/useOptimizedProjects'

interface Project {
  id: string
  name: string
  status: string
  address?: string
  cover_image_url?: string
  client_name?: string
  start_date?: string
  end_date?: string
}

interface AppProjectContextValue {
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
  projects: Project[]
  isLoading: boolean
}

const AppProjectContext = createContext<AppProjectContextValue | undefined>(undefined)

export function AppProjectProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useOptimizedProjects()
  const projects = useMemo(() => (data?.data || []) as Project[], [data?.data])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0])
    }
  }, [projects, selectedProject])

  return (
    <AppProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        projects,
        isLoading,
      }}
    >
      {children}
    </AppProjectContext.Provider>
  )
}

export function useAppProject() {
  const context = useContext(AppProjectContext)
  if (context === undefined) {
    throw new Error('useAppProject must be used within an AppProjectProvider')
  }
  return context
}
