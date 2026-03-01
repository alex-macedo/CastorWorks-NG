import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/lib/i18n/i18n';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

// WhatsApp message types
export type MessageTemplateType = 
  | 'project_update'
  | 'milestone_reached'
  | 'payment_reminder'
  | 'meeting_scheduled'
  | 'diary_shared'

// Message template interface
export interface MessageTemplate {
  type: MessageTemplateType
  title: string
  description: string
  defaultMessage: string
}

export interface TemplateVariables {
  projectName?: string
  clientName?: string
  project?: string
  client?: string
}

// Pre-defined message templates
export const MESSAGE_TEMPLATES: Record<MessageTemplateType, Omit<MessageTemplate, 'type'>> = {
  project_update: {
    title: 'architect.whatsapp.templates.projectUpdate.title',
    description: 'architect.whatsapp.templates.projectUpdate.description',
    defaultMessage: 'architect.whatsapp.templates.projectUpdate.defaultMessage',
  },
  milestone_reached: {
    title: 'architect.whatsapp.templates.milestoneReached.title',
    description: 'architect.whatsapp.templates.milestoneReached.description',
    defaultMessage: 'architect.whatsapp.templates.milestoneReached.defaultMessage',
  },
  payment_reminder: {
    title: 'architect.whatsapp.templates.paymentReminder.title',
    description: 'architect.whatsapp.templates.paymentReminder.description',
    defaultMessage: 'architect.whatsapp.templates.paymentReminder.defaultMessage',
  },
  meeting_scheduled: {
    title: 'architect.whatsapp.templates.meetingScheduled.title',
    description: 'architect.whatsapp.templates.meetingScheduled.description',
    defaultMessage: 'architect.whatsapp.templates.meetingScheduled.defaultMessage',
  },
  diary_shared: {
    title: 'architect.whatsapp.templates.diaryShared.title',
    description: 'architect.whatsapp.templates.diaryShared.description',
    defaultMessage: 'architect.whatsapp.templates.diaryShared.defaultMessage',
  },
}

export const resolveTemplateMessage = (
  templateType: MessageTemplateType,
  variables: TemplateVariables = {}
): string => {
  const template = MESSAGE_TEMPLATES[templateType]
  const projectName = variables.projectName || variables.project || i18n.t('architect.whatsapp.labels.project')
  const clientName = variables.clientName || variables.client || i18n.t('architect.whatsapp.labels.client')

  let message = i18n.t(template.defaultMessage, {
    projectName,
    clientName
  })

  const replacements: Record<string, string> = {
    '[project]': projectName,
    '[client]': clientName
  }

  Object.entries(replacements).forEach(([key, value]) => {
    const safeKey = key.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    const regex = new RegExp(safeKey, 'g')
    message = message.replace(regex, value)
  })

  return message
}

// Request parameters for sending WhatsApp message
export interface SendWhatsAppMessageRequest {
  phoneNumber: string
  /** Freeform message body (use when replying within 24h window) */
  message?: string
  projectId?: string
  /** Twilio Content Template SID - when provided, uses template instead of message */
  contentSid?: string
  /** Template variables, e.g. {"1":"12/1","2":"3pm"} */
  contentVariables?: Record<string, string>
}

// Response from WhatsApp API
export interface SendWhatsAppMessageResponse {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

// Parameters for AI message draft
export interface AIDraftMessageRequest {
  projectId?: string
  templateType: MessageTemplateType
  clientId?: string
  language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR'
}

// Response from AI draft
export interface AIDraftMessageResponse {
  message: string
  generatedAt: string
}

// Hook for sending WhatsApp message
export const useSendWhatsAppMessage = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<SendWhatsAppMessageResponse, Error, SendWhatsAppMessageRequest>({
    mutationFn: async ({ phoneNumber, message, projectId, contentSid, contentVariables }) => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('User not authenticated')
      }

      const body: Record<string, unknown> = { phoneNumber, projectId }
      if (contentSid) {
        body.contentSid = contentSid
        if (contentVariables) body.contentVariables = contentVariables
      } else if (message) {
        body.message = message
      } else {
        throw new Error('Either message or contentSid must be provided')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-notification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to send WhatsApp message: ${response.status}`)
      }

      const data = await response.json()
      return data as SendWhatsAppMessageResponse
    },
    onSuccess: (data) => {
      toast({
        title: 'whatsapp.messages.sentSuccess',
        description: 'whatsapp.messages.sentSuccessDesc',
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['whatsappMessages'] 
      })
    },
    onError: (err) => {
      toast({
        title: 'whatsapp.messages.sendError',
        description: err?.message || 'whatsapp.messages.sendErrorDesc',
        variant: 'destructive'
      })
    },
  })
}

// Hook for generating AI message draft
export const useAIDraftMessage = () => {
  const { toast } = useToast()

  return useMutation<AIDraftMessageResponse, Error, AIDraftMessageRequest>({
    mutationFn: async ({ projectId, templateType, clientId, language = 'en-US' }) => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('User not authenticated')
      }
      
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      // 1. Fetch Project Details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (projectError || !project) {
        throw new Error('Failed to fetch project details')
      }

      // 2. Fetch Context Data based on template
      const contextData: any = {}
      
      // Fetch latest phase for context
      const { data: phases } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('end_date', { ascending: false })
      
      // Fetch latest daily log for context
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('log_date', { ascending: false })
        .limit(1)

      const latestLog = logs?.[0]
      const currentPhase = phases?.find(p => p.status === 'in-progress') || phases?.[0]
      const lastCompletedPhase = phases?.find(p => p.status === 'completed')
      const nextPhase = phases?.find(p => p.status === 'pending')

      // Get locale for formatting
      const locale = i18n.language === 'pt-BR' ? ptBR : enUS
      const currency = i18n.language === 'pt-BR' ? 'BRL' : 'USD'

      // 3. Prepare replacement variables
      const variables: Record<string, string> = {
        '[project]': project.name,
        '[client]': project.client_name || 'Client',
      }

      // Add template-specific variables
      if (templateType === 'project_update') {
        const progress = currentPhase?.project_percentage || 0
        variables['{{progress}}'] = progress.toString()
        variables['[recent_activity]'] = latestLog?.tasks_completed || i18n.t('whatsapp.templates.placeholders.generalVerification')
        variables['[upcoming_tasks]'] = nextPhase?.phase_name || i18n.t('whatsapp.templates.placeholders.nextSteps')
      }
      
      if (templateType === 'milestone_reached') {
        variables['[phase]'] = lastCompletedPhase?.phase_name || currentPhase?.phase_name || 'Phase 1'
        variables['[next_phase]'] = nextPhase?.phase_name || 'Next Phase'
        variables['[start_date]'] = nextPhase?.start_date 
          ? format(new Date(nextPhase.start_date), 'dd/MM/yyyy', { locale })
          : format(new Date(), 'dd/MM/yyyy', { locale })
      }

      if (templateType === 'diary_shared') {
        variables['[summary]'] = latestLog?.tasks_completed || 'Daily update'
        variables['[diary_link]'] = `${window.location.origin}/projects/${projectId}/diary/${latestLog?.id || ''}`
      }

      if (templateType === 'payment_reminder') {
         // First get the tax_project_id
         const { data: taxProject } = await supabase
           .from('tax_projects')
           .select('id')
           .eq('project_id', projectId)
           .maybeSingle()
         
         let payment = null;
         
         if (taxProject) {
            // Try to find a pending tax payment
            const { data: payments } = await supabase
              .from('tax_payments')
              .select('*')
              .eq('tax_project_id', taxProject.id)
              .eq('status', 'PENDING')
              .order('due_date', { ascending: true })
              .limit(1)
            
            payment = payments?.[0]
         }
        
        if (!payment || !payment.amount || payment.amount === 0) {
           variables['[amount]'] = '0,00'
           // Check if we should throw error or just allow user to edit
           // For better UX during demo/testing without data, we might not want to block COMPLETELY 
           // but the requirement was "user should be informed not to send".
           // Throwing error stops generation.
           throw new Error(i18n.t('whatsapp.validation.noPendingPayment'))
        }

        variables['[amount]'] = new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(payment.amount)
        
        variables['[due_date]'] = payment?.due_date
          ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale })
          : format(new Date(), 'dd/MM/yyyy', { locale })
      }
      
      if (templateType === 'meeting_scheduled') {
        // Mock next day meeting as default
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        variables['[date]'] = format(tomorrow, 'dd/MM/yyyy', { locale })
        variables['[time]'] = '10:00'
      }

      // 4. Perform Replacement
      const template = MESSAGE_TEMPLATES[templateType]
      let messageContent = i18n.t(template.defaultMessage)

      Object.entries(variables).forEach(([key, value]) => {
        // Create a regex to replace all occurrences, escaping brackets
        const safeKey = key.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
        const regex = new RegExp(safeKey, 'g')
        messageContent = messageContent.replace(regex, value)
        
        // Also handle {{variable}} style if mixed
        if (key.startsWith('{{')) {
           const mustacheKey = key // already in {{ }} format
           messageContent = messageContent.replace(mustacheKey, value)
        }
      })

      return {
        message: messageContent,
        generatedAt: new Date().toISOString(),
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'whatsapp.ai.draftGenerated',
      })
    },
    onError: (err) => {
      toast({
        title: 'whatsapp.ai.draftError',
        description: err?.message || 'whatsapp.ai.draftErrorDesc',
        variant: 'destructive'
      })
    },
  })
}

// Hook for fetching message history (if implemented in future)
export const useWhatsAppMessageHistory = (clientId?: string) => {
  return useQuery({
    queryKey: ['whatsappMessages', clientId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('User not authenticated')
      }

      // For now, return empty array - would be implemented with a real database table
      return []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!clientId,
  })
}

// Utility function to format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // Format based on length
  if (cleaned.length === 11 && cleaned.startsWith('55')) {
    // Brazilian format: +55 (XX) XXXXX-XXXX
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  } else if (cleaned.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // Default: add + if not present
  return phone.startsWith('+') ? phone : `+${phone}`
}

// Utility function to validate phone number (E.164 format)
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) {
    return { valid: false, error: 'architect.whatsapp.validation.phoneRequired' }
  }

  // Check E.164 format
  const e164Pattern = /^\+[1-9]\d{1,14}$/
  if (!e164Pattern.test(phone)) {
    return { valid: false, error: 'architect.whatsapp.validation.invalidFormat' }
  }

  return { valid: true }
}

// Utility function to generate WhatsApp link (wa.me)
export const generateWhatsAppLink = (phone: string, message?: string): string => {
  const cleanedPhone = phone.replace(/\D/g, '')
  const baseUrl = `https://wa.me/${cleanedPhone}`
  
  if (message) {
    const encodedMessage = encodeURIComponent(message)
    return `${baseUrl}?text=${encodedMessage}`
  }
  
  return baseUrl
}
