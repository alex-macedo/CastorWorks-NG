import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface Stakeholder {
  id: string
  project_id: string
  name: string
  email: string
  phone: string | null
  role: string
  company: string | null
  stakeholder_type: 'client' | 'contractor' | 'supplier' | 'consultant' | 'team' | 'other'
  is_lead: boolean
  last_contact_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Demo fallback – shown when the project_stakeholders table is empty so the
// mobile app can be demoed without seeding data.
// ---------------------------------------------------------------------------
const DEMO_STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'demo-sh-1',
    project_id: 'demo',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@client.com',
    phone: '+1 (555) 234-5678',
    role: 'Project Owner',
    company: 'Jenkins Development',
    stakeholder_type: 'client',
    is_lead: true,
    last_contact_date: new Date().toISOString().split('T')[0],
    notes: 'Primary decision maker on all Phase 2 scope changes.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-2',
    project_id: 'demo',
    name: 'Michael Chen',
    email: 'michael.chen@consult.com',
    phone: '+1 (555) 345-6789',
    role: 'Structural Engineer',
    company: 'Chen & Associates',
    stakeholder_type: 'consultant',
    is_lead: false,
    last_contact_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-3',
    project_id: 'demo',
    name: 'Ana Silva',
    email: 'ana.silva@contractor.com',
    phone: '+1 (555) 456-7890',
    role: 'General Contractor',
    company: 'Silva Construction',
    stakeholder_type: 'contractor',
    is_lead: true,
    last_contact_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Manages all on-site crews. Prefer calls before 10 AM.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-4',
    project_id: 'demo',
    name: 'James Wilson',
    email: 'james.wilson@client.com',
    phone: '+1 (555) 567-8901',
    role: 'Legal Advisor',
    company: 'Wilson Law Group',
    stakeholder_type: 'consultant',
    is_lead: false,
    last_contact_date: null,
    notes: 'Handles all permit and compliance filings.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-5',
    project_id: 'demo',
    name: 'Lisa Park',
    email: 'lisa.park@consult.com',
    phone: '+1 (555) 678-9012',
    role: 'Architect',
    company: 'Park Design Studio',
    stakeholder_type: 'consultant',
    is_lead: false,
    last_contact_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-6',
    project_id: 'demo',
    name: 'Roberto Garcia',
    email: 'roberto.garcia@contractor.com',
    phone: '+1 (555) 789-0123',
    role: 'Electrical Sub',
    company: 'Garcia Electric',
    stakeholder_type: 'contractor',
    is_lead: false,
    last_contact_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Scheduled for conduit routing review this week.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-7',
    project_id: 'demo',
    name: 'Emily Thompson',
    email: 'emily.thompson@supplier.com',
    phone: '+1 (555) 890-1234',
    role: 'Materials Supplier',
    company: 'Thompson Materials',
    stakeholder_type: 'supplier',
    is_lead: false,
    last_contact_date: null,
    notes: 'Lead time on steel beams is currently 3 weeks.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sh-8',
    project_id: 'demo',
    name: 'David Kim',
    email: 'david.kim@team.com',
    phone: '+1 (555) 901-2345',
    role: 'Site Manager',
    company: 'CastorWorks',
    stakeholder_type: 'team',
    is_lead: false,
    last_contact_date: new Date().toISOString().split('T')[0],
    notes: 'Internal – runs daily site coordination.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function useStakeholders(projectId?: string) {
  const queryClient = useQueryClient()

  const {
    data: stakeholders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stakeholders', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('project_stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('is_lead', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        // Gracefully handle missing table until migration is deployed
        if (/does not exist/i.test(error.message)) return []
        throw error
      }

      return data as Stakeholder[]
    },
    enabled: !!projectId,
  })

  const updateLastContact = useMutation({
    mutationFn: async (stakeholderId: string) => {
      const { error } = await supabase
        .from('project_stakeholders')
        .update({ last_contact_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
        .eq('id', stakeholderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] })
    },
  })

  // Fall back to demo data when the table is empty (useful for live demos)
  const effectiveStakeholders = isLoading ? [] : (stakeholders.length > 0 ? stakeholders : DEMO_STAKEHOLDERS)

  return {
    stakeholders: effectiveStakeholders,
    isLoading,
    error,
    updateLastContact,
  }
}
