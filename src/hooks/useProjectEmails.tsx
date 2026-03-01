import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ProjectEmail {
  id: string
  project_id: string
  recipients: string[]
  subject: string
  body: string
  scheduled_for: string | null
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface SendEmailInput {
  recipients: string[]
  subject: string
  body: string
  scheduledFor?: string
}

// ---------------------------------------------------------------------------
// Demo fallback – shown when the project_emails table is empty so the mobile
// app can be demoed without seeding data.  Recipient emails intentionally
// match DEMO_STAKEHOLDERS so resolveRecipientNames() renders names correctly.
// ---------------------------------------------------------------------------
const _NOW = Date.now()
const _H = 60 * 60 * 1000
const _D = 24 * _H

const DEMO_EMAILS: ProjectEmail[] = [
  {
    id: 'demo-email-1',
    project_id: 'demo',
    recipients: ['sarah.jenkins@client.com', 'james.wilson@client.com'],
    subject: 'Weekly Progress Report – Phase 2',
    body: 'Hi team,\n\nAttached is the weekly progress summary for Phase 2. Key highlights:\n• Structural framing 78% complete\n• Electrical rough-in on schedule\n• One open RFI pending from the architect\n\nPlease let me know if you have questions.\n\nBest,\nSite Team',
    scheduled_for: new Date(_NOW + 6 * _H).toISOString(),
    status: 'pending',
    sent_at: null,
    created_by: 'demo',
    created_at: new Date(_NOW - 2 * _H).toISOString(),
    updated_at: new Date(_NOW - 2 * _H).toISOString(),
  },
  {
    id: 'demo-email-2',
    project_id: 'demo',
    recipients: ['sarah.jenkins@client.com'],
    subject: 'Monthly Budget Summary – January',
    body: 'Sarah,\n\nPlease find below the January budget summary:\n• Original estimate: $2.4M\n• Spent to date: $1.82M (76%)\n• Forecasted overage: $12,400 (Structural Phase)\n\nI\'ve flagged the overage for review. Happy to discuss.\n\nRegards,\nFinance',
    scheduled_for: null,
    status: 'pending',
    sent_at: null,
    created_by: 'demo',
    created_at: new Date(_NOW - _D).toISOString(),
    updated_at: new Date(_NOW - _D).toISOString(),
  },
  {
    id: 'demo-email-3',
    project_id: 'demo',
    recipients: ['sarah.jenkins@client.com', 'james.wilson@client.com', 'michael.chen@consult.com'],
    subject: 'Milestone Achieved – Foundation Complete',
    body: 'All,\n\nHappy to report that the foundation work for Phase 1 has been completed and signed off by the inspector.\n\nNext milestone: structural framing kick-off next Monday.\n\nThanks everyone for the hard work!\n\nCheers,\nProject Team',
    scheduled_for: null,
    status: 'sent',
    sent_at: new Date(_NOW - 3 * _D).toISOString(),
    created_by: 'demo',
    created_at: new Date(_NOW - 3 * _D).toISOString(),
    updated_at: new Date(_NOW - 3 * _D).toISOString(),
  },
]

export function useProjectEmails(projectId?: string) {
  const queryClient = useQueryClient()

  const {
    data: emails = [],
    isLoading,
  } = useQuery({
    queryKey: ['project-emails', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('project_emails')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as ProjectEmail[]
    },
    enabled: !!projectId,
  })

  const sendEmail = useMutation({
    mutationFn: async ({ recipients, subject, body, scheduledFor }: SendEmailInput) => {
      if (!projectId) throw new Error('No project selected')

      const isScheduled = scheduledFor && new Date(scheduledFor) > new Date()

      const { data, error } = await supabase
        .from('project_emails')
        .insert({
          project_id: projectId,
          recipients,
          subject,
          body,
          scheduled_for: scheduledFor || null,
          status: isScheduled ? 'pending' : 'sent',
          sent_at: isScheduled ? null : new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data as ProjectEmail
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-emails', projectId] })
    },
  })

  // Fall back to demo data when the table is empty (useful for live demos)
  const effectiveEmails = isLoading ? [] : (emails.length > 0 ? emails : DEMO_EMAILS)

  return {
    emails: effectiveEmails,
    isLoading,
    sendEmail,
  }
}
