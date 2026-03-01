import type { RoadmapKanbanColumn } from '@/hooks/useRoadmapKanbanColumns'

const DEFAULT_COLUMN_COLORS: Record<string, string> = {
  backlog: 'slate-400',
  next_up: 'blue-500',
  in_progress: 'blue-500',
  blocked: 'red-500',
  done: 'green-500',
}

export const ROADMAP_COLOR_KEYS = [
  'slate-400',
  'blue-500',
  'red-500',
  'green-500',
  'amber-500',
  'violet-500',
  'cyan-500',
  'orange-500',
] as const

export const ROADMAP_COLOR_BG_CLASS: Record<string, string> = {
  'slate-400': 'bg-slate-400',
  'blue-500': 'bg-blue-500',
  'red-500': 'bg-red-500',
  'green-500': 'bg-green-500',
  'amber-500': 'bg-amber-500',
  'violet-500': 'bg-violet-500',
  'cyan-500': 'bg-cyan-500',
  'orange-500': 'bg-orange-500',
}

export const ROADMAP_COLOR_TEXT_CLASS: Record<string, string> = {
  'slate-400': 'text-slate-500',
  'blue-500': 'text-blue-500',
  'red-500': 'text-red-500',
  'green-500': 'text-green-500',
  'amber-500': 'text-amber-500',
  'violet-500': 'text-violet-500',
  'cyan-500': 'text-cyan-500',
  'orange-500': 'text-orange-500',
}

export function getDefaultColumnColorKey(columnId: string): string {
  return DEFAULT_COLUMN_COLORS[columnId] ?? 'slate-400'
}

export function getColumnColorKey(column: RoadmapKanbanColumn): string {
  return (column.color && column.color.trim()) || getDefaultColumnColorKey(column.id)
}

export function getColumnBgClass(column: RoadmapKanbanColumn): string {
  const key = getColumnColorKey(column)
  return ROADMAP_COLOR_BG_CLASS[key] ?? 'bg-slate-400'
}

export function getColumnTextClass(column: RoadmapKanbanColumn): string {
  const key = getColumnColorKey(column)
  return ROADMAP_COLOR_TEXT_CLASS[key] ?? 'text-slate-500'
}
