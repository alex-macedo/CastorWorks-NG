/**
 * Mobile App Types
 * Adapted from castorworks-mobile-app/types.ts for integration with main CastorWorks app
 */

export type MobileScreen = 
  | 'DASHBOARD' 
  | 'BUILDER' 
  | 'CONTACTS' 
  | 'MOODBOARD' 
  | 'MEETING' 
  | 'NOTIFICATIONS' 
  | 'LOGS' 
  | 'FINANCE' 
  | 'SHOPPING' 
  | 'TASKS'
  | 'BRANDING'
  | 'ANNOTATIONS'
  | 'FLOOR_PLAN'
  | 'LIVE_MEETING'
  | 'MEETING_REVIEW'
  | 'AGENDA_BUILDER'
  | 'MOODBOARD_CHAT'
  | 'MOODBOARD_CONFIRMED'
  | 'REPORT_PREVIEW'
  | 'FINANCE_PROJECTION'
  | 'PROJECT_CHAT'
  | 'EMAIL_REVIEW';

// Screen to route mapping - matches actual routes in App.tsx
export const SCREEN_ROUTES: Record<MobileScreen, string> = {
  DASHBOARD: '/app',
  BUILDER: '/app/builder',
  CONTACTS: '/app/contacts',
  MOODBOARD: '/app/moodboard',
  MEETING: '/app/meeting',
  NOTIFICATIONS: '/app/notifications',
  LOGS: '/app/daily-log',
  FINANCE: '/app/finance',
  SHOPPING: '/app/procurement',
  TASKS: '/app/tasks',
  BRANDING: '/app/branding',
  ANNOTATIONS: '/app/annotations',
  FLOOR_PLAN: '/app/floor-plans',
  LIVE_MEETING: '/app/meeting',
  MEETING_REVIEW: '/app/meeting-review',
  AGENDA_BUILDER: '/app/agenda',
  MOODBOARD_CHAT: '/app/moodboard', 
  MOODBOARD_CONFIRMED: '/app/moodboard',
  REPORT_PREVIEW: '/app/reports',
  FINANCE_PROJECTION: '/app/finance',
  PROJECT_CHAT: '/app/chat',
  EMAIL_REVIEW: '/app/email-review',
}

// Route to screen mapping (reverse)
export const ROUTE_SCREENS: Record<string, MobileScreen> = {
  ...Object.fromEntries(
    Object.entries(SCREEN_ROUTES).map(([screen, route]) => [route, screen as MobileScreen])
  ),
  // Explicit overrides to ensure canonical screens for shared routes
  '/app': 'DASHBOARD',
  '/app/finance': 'FINANCE',
  '/app/meeting': 'MEETING',
  '/app/contacts': 'CONTACTS',
  '/app/daily-log': 'LOGS',
  '/app/tasks': 'TASKS',
  '/app/annotations': 'ANNOTATIONS',
  '/app/moodboard': 'MOODBOARD',
  '/app/reports': 'REPORT_PREVIEW',
  '/app/floor-plans': 'FLOOR_PLAN',
  '/app/builder': 'BUILDER',
  '/app/procurement': 'SHOPPING',
  '/app/agenda': 'AGENDA_BUILDER',
  '/app/meeting-review': 'MEETING_REVIEW',
  '/app/branding': 'BRANDING',
} as Record<string, MobileScreen>

export interface MobileProject {
  id: string
  name: string
  location: string
  owner: string
  completion: number
  status: 'On Track' | 'Delayed' | 'Critical'
  type: 'Construction' | 'Design Phase'
  image: string
}

export interface MobileContact {
  id: string
  name: string
  role: string
  company: string
  type: 'Client' | 'Contractor' | 'Supplier' | 'Consultant'
  isLead?: boolean
  image?: string
}

export interface MobileTask {
  id: string
  title: string
  description: string
  status: 'Active' | 'Delayed' | 'Done'
  assignedTo: string[]
  dueDate: string
}
