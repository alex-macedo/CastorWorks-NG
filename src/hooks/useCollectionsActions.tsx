import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useLocalization } from '@/contexts/LocalizationContext'

interface SendWhatsAppParams {
  invoiceId: string
  phoneNumber?: string
  message?: string
  projectId?: string
}

interface SendEmailParams {
  invoiceId: string
  recipientEmail: string
  subject: string
  body: string
  projectId?: string
}

export function useCollectionsActions() {
  const { toast } = useToast()
  const { t } = useLocalization()
  const queryClient = useQueryClient()

  // Send WhatsApp mutation
  const sendWhatsApp = useMutation({
    mutationFn: async ({ invoiceId, phoneNumber, message, projectId }: SendWhatsAppParams) => {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('financial_ar_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
      }

      // Construct default message if not provided
      const defaultMessage = message || t('financial:collections.defaultWhatsAppMessage', {
        customerName: invoice.client_name,
        invoiceNumber: invoice.invoice_number,
        totalAmount: invoice.total_amount,
        dueDate: invoice.due_date
      })

      // Get client phone number - note: client_phone field doesn't exist in the database
      // We'll use the provided phoneNumber or show an error
      const clientPhone = phoneNumber

      if (!clientPhone) {
        throw new Error('Phone number is required for WhatsApp notifications. Please add a phone number to the client contact information.')
      }

      // Call WhatsApp Edge Function
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          phoneNumber: clientPhone,
          message: defaultMessage,
          projectId: invoice.project_id
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Record the collection action
      await supabase
        .from('financial_collection_actions')
        .insert({
          invoice_id: invoiceId,
          sequence_id: null, // Manual action
          step_number: 0,
          action_type: 'whatsapp',
          status: 'sent',
          scheduled_at: new Date().toISOString(),
          executed_at: new Date().toISOString(),
          recipient_phone: clientPhone,
          recipient_name: invoice.client_name,
          message_template: 'manual_collection',
          message_body: defaultMessage,
          external_message_id: data?.messageSid,
          external_provider: 'twilio',
          was_successful: true
        })

      return data
    },
    onSuccess: (data, variables) => {
      toast({
        title: t('financial:collections.whatsappSent'),
        description: t('financial:collections.whatsappSentDesc', { 
          invoice: variables.invoiceId 
        })
      })
      
      // Refresh collections data
      queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
      queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: t('financial:collections.whatsappError'),
        variant: 'destructive'
      })
      console.error('WhatsApp send error:', error)
    }
  })

  // Send Email mutation
  const sendEmail = useMutation({
    mutationFn: async ({ invoiceId, recipientEmail, subject, body, projectId }: SendEmailParams) => {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('financial_ar_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
      }

      // Use provided email - note: client_email field doesn't exist in the database
      // We'll use the provided recipientEmail or show an error
      const email = recipientEmail

      if (!email) {
        throw new Error('Email address is required for email notifications. Please add an email address to the client contact information.')
      }

      // Call Email Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          project_id: projectId || invoice.project_id,
          recipients: [email],
          subject: subject || t('financial:collections.collectionReminderSubject', {
            invoiceNumber: invoice.invoice_number
          }),
          body: body || t('financial:collections.collectionReminderBody', {
            customerName: invoice.client_name,
            invoiceNumber: invoice.invoice_number,
            totalAmount: invoice.total_amount,
            dueDate: invoice.due_date
          })
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Record the collection action
      await supabase
        .from('financial_collection_actions')
        .insert({
          invoice_id: invoiceId,
          sequence_id: null, // Manual action
          step_number: 0,
          action_type: 'email',
          status: 'sent',
          scheduled_at: new Date().toISOString(),
          executed_at: new Date().toISOString(),
          recipient_email: email,
          recipient_name: invoice.client_name,
          message_template: 'manual_collection',
          message_subject: subject,
          message_body: body,
          external_message_id: data?.email_id,
          external_provider: 'sendgrid',
          was_successful: true
        })

      return data
    },
    onSuccess: (data, variables) => {
      toast({
        title: t('financial:collections.emailSent'),
        description: t('financial:collections.emailSentDesc', { 
          invoice: variables.invoiceId 
        })
      })
      
      // Refresh collections data
      queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
      queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: t('financial:collections.emailError'),
        variant: 'destructive'
      })
      console.error('Email send error:', error)
    }
  })

  // Record payment mutation
  const recordPayment = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      amount, 
      paymentMethod, 
      paymentDate, 
      reference, 
      notes 
    }: {
      invoiceId: string
      amount: number
      paymentMethod: string
      paymentDate: string
      reference?: string
      notes?: string
    }) => {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('financial_payments')
        .insert({
          invoice_id: invoiceId,
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference,
          notes,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (paymentError) {
        throw new Error(paymentError.message)
      }

      // Update invoice status and amount paid
      const { data: invoice, error: invoiceError } = await supabase
        .from('financial_ar_invoices')
        .select('amount_paid, total_amount')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) {
        throw new Error(invoiceError.message)
      }

      const newAmountPaid = Number(invoice.amount_paid) + amount
      const newStatus = newAmountPaid >= Number(invoice.total_amount) ? 'paid' : 'partially_paid'

      await supabase
        .from('financial_ar_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      return payment
    },
    onSuccess: () => {
      toast({
        title: t('financial:collections.paymentRecorded'),
        description: t('financial:collections.invoiceUpdated')
      })
      
      // Refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
      queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
      queryClient.invalidateQueries({ queryKey: ['financial_ar_invoices'] })
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: t('financial:collections.paymentRecordingError'),
        variant: 'destructive'
      })
      console.error('Payment recording error:', error)
    }
  })

  return {
    sendWhatsApp,
    sendEmail,
    recordPayment,
    isSendingWhatsApp: sendWhatsApp.isPending,
    isSendingEmail: sendEmail.isPending,
    isRecordingPayment: recordPayment.isPending
  }
}
