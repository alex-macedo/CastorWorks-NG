import { useState } from 'react'
import { 
  History, 
  Settings2, 
  ShieldAlert, 
  TrendingUp, 
  Filter, 
  ArrowUpRight,
  MessageCircle,
  Mail,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { formatCurrency } from '@/utils/formatters'
import { format } from 'date-fns'
import { differenceInDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { InvoiceDetailsDialog } from '@/components/Financial/Collections/InvoiceDetailsDialog'
import { MarkAsPaidDialog } from '@/components/Financial/Collections/MarkAsPaidDialog'
import { EscalateDialog } from '@/components/Financial/Collections/EscalateDialog'
import { SkipStepDialog } from '@/components/Financial/Collections/SkipStepDialog'
import { CollectionsSettingsDialog } from '@/components/Financial/Collections/CollectionsSettingsDialog'
import { useCollectionsActions } from '@/hooks/useCollectionsActions'

export default function FinancialCollections() {
  const { t, currency } = useLocalization()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isTriggering, setIsTriggering] = useState(false)
  
  // Collections actions hook
  const { sendWhatsApp, sendEmail, recordPayment } = useCollectionsActions()
  
  // Dialog states
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showMarkAsPaidDialog, setShowMarkAsPaidDialog] = useState(false)
  const [showEscalateDialog, setShowEscalateDialog] = useState(false)
  const [showSkipStepDialog, setShowSkipStepDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Fetch Priority Queue
  const { data: queue, isLoading: isQueueLoading } = useQuery({
    queryKey: ['collectionPriorityQueue'],
    queryFn: async () => {
      // First update scores
      await supabase.rpc('update_all_collection_scores')
      
      const { data, error } = await supabase
        .from('financial_ar_invoices')
        .select('*, projects(name), days_overdue, collection_priority_score')
        .in('status', ['issued', 'overdue', 'partially_paid'])
        .gt('days_overdue', 0) // Only include invoices that are actually overdue
        .order('collection_priority_score', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  // Fetch Recent Activity
  const { data: activity } = useQuery({
    queryKey: ['collectionActivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_collection_actions')
        .select('*, financial_ar_invoices(invoice_number, client_name)')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data
    }
  })

  // Trigger Collections Mutation
  const triggerCollections = useMutation({
    mutationFn: async () => {
      setIsTriggering(true)
      const { data, error } = await supabase.functions.invoke('trigger-collection-actions', {
        body: { dry_run: false }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({ title: t('financial:collections.success'), description: t('financial:collections.triggerSuccess') })
      queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
      queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
    },
    onError: (err: any) => {
      toast({ title: t('common:error'), description: err.message, variant: 'destructive' })
    },
    onSettled: () => setIsTriggering(false)
  })

  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return Math.max(0, differenceInDays(today, due))
  }

  const getPriorityColor = (score: number) => {
    if (score > 60) return 'text-red-600 bg-red-50 border-red-200'
    if (score > 30) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  // Action handlers
  const handleViewDetails = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowDetailsDialog(true)
  }

  const handleMarkAsPaid = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowMarkAsPaidDialog(true)
  }

  const handleEscalate = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowEscalateDialog(true)
  }

  const handleSkipStep = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowSkipStepDialog(true)
  }

  const handleSendWhatsApp = async (invoice: any) => {
    try {
      // Since the database doesn't have client_phone field, we'll show an error
      // In a real implementation, you would need to:
      // 1. Add client_phone and client_email fields to the financial_ar_invoices table
      // 2. Or create a separate client contacts table
      // 3. Or prompt the user to enter the contact information
      
      toast({
        title: t('common:error'),
        description: t('financial:collections.contactInfoMissing'),
        variant: 'destructive'
      })
      
      // For now, we'll skip the WhatsApp functionality
      console.log('WhatsApp functionality requires client contact information to be added to the database')
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleSendEmail = async (invoice: any) => {
    try {
      // Since the database doesn't have client_email field, we'll show an error
      toast({
        title: t('common:error'),
        description: t('financial:collections.contactInfoMissing'),
        variant: 'destructive'
      })
      
      // For now, we'll skip the email functionality
      console.log('Email functionality requires client contact information to be added to the database')
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Simple loading states since we're not using the mutations
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  const handlePaymentSuccess = () => {
    // Payment success is handled by the mutation
    setShowMarkAsPaidDialog(false)
  }

  const handleEscalationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
    queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
    toast({
      title: t('financial:collections.escalationCreated'),
      description: t('financial:collections.escalationRecorded')
    })
  }

  const handleSkipStepSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['collectionPriorityQueue'] })
    queryClient.invalidateQueries({ queryKey: ['collectionActivity'] })
    toast({
      title: t('financial:collections.stepSkipped'),
      description: t('financial:collections.collectionUpdated')
    })
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('financial:collections.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('financial:collections.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="glass-style-white" onClick={() => triggerCollections.mutate()} disabled={isTriggering}>
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('financial:collections.triggerSequences')}
            </Button>
            <Button variant="glass-style-white" onClick={() => setShowSettingsDialog(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              {t('financial:collections.settings')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">{t('financial:collections.totalOverdue')}</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(queue?.reduce((s, i) => s + Number(i.total_amount - i.amount_paid), 0) || 0, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">{t('financial:collections.avgDaysLate')}</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.round(queue?.reduce((s, i) => s + i.days_overdue, 0) / (queue?.length || 1))} {t('financial:days')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">{t('financial:collections.collectionRate')}</p>
            <p className="text-2xl font-bold text-green-600">82%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">{t('financial:collections.activeSequences')}</p>
            <p className="text-2xl font-bold text-primary">{queue?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Priority Queue */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('financial:collections.priorityQueue')}</CardTitle>
                <CardDescription>{t('financial:collections.priorityQueueDescription')}</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" /> {t('financial:collections.filter')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isQueueLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('financial:collections.loadingQueue')}</div>
              ) : queue?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('financial:collections.noOverdueInvoices')}</div>
              ) : (
                queue?.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full border ${getPriorityColor(invoice.collection_priority_score)}`}>
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{invoice.client_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{invoice.invoice_number}</span>
                          <span>•</span>
                          <span>{invoice.projects?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                      <div className="hidden sm:block">
                        <p className="text-sm font-bold">{formatCurrency(invoice.total_amount - invoice.amount_paid, currency)}</p>
                        <p className="text-xs text-destructive">
                          {(() => {
                            const daysOverdue = invoice.days_overdue !== undefined && invoice.days_overdue !== null 
                              ? invoice.days_overdue 
                              : calculateDaysOverdue(invoice.due_date)
                            
                            // Debug logging
                            console.log('Invoice days_overdue:', invoice.days_overdue, 'Calculated:', calculateDaysOverdue(invoice.due_date), 'Final:', daysOverdue)
                            
                            return t('financial:collections.daysOverdue', { count: daysOverdue })
                          })()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {t('financial:collections.score', { score: invoice.collection_priority_score })}
                        </Badge>
                        <div className="flex gap-1">
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleSendWhatsApp(invoice)} disabled={isWhatsAppLoading}>
                             <MessageCircle className="h-4 w-4" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleSendEmail(invoice)} disabled={isEmailLoading}>
                             <Mail className="h-4 w-4" />
                           </Button>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(invoice)}>
                                {t('financial:collections.viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                {t('financial:collections.markAsPaid')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSkipStep(invoice)}>
                                {t('financial:collections.skipStep')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEscalate(invoice)} className="text-destructive">
                                {t('financial:collections.escalate')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>{t('financial:collections.recentActivity')}</CardTitle>
            <CardDescription>{t('financial:collections.automatedActionsLog')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activity?.map((act) => (
                <div key={act.id} className="relative pl-6 pb-6 border-l last:pb-0">
                  <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {act.action_type === 'whatsapp' ? t('financial:collections.whatsAppSent') : t('financial:collections.emailSent')}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(act.created_at), 'HH:mm')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('financial:arWorkspace.invoiceNumber')}: {act.financial_ar_invoices?.invoice_number} - {act.financial_ar_invoices?.client_name}
                    </p>
                    <div className="flex items-center gap-1 pt-1">
                      {act.status === 'completed' || act.status === 'sent' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0 h-4">
                          <CheckCircle2 className="h-2 w-2 mr-1" /> {t('financial:collections.delivered')}
                        </Badge>
                      ) : act.status === 'failed' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0 h-4">
                          <AlertCircle className="h-2 w-2 mr-1" /> {t('financial:collections.failed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 h-4">
                          <Clock className="h-2 w-2 mr-1" /> {t('financial:collections.scheduled')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs" size="sm">
                {t('financial:collections.viewFullLog')} <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {selectedInvoice && (
        <>
          <InvoiceDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            invoice={selectedInvoice}
            onMarkAsPaid={() => {
              setShowDetailsDialog(false)
              setShowMarkAsPaidDialog(true)
            }}
            onSendWhatsApp={() => handleSendWhatsApp(selectedInvoice)}
            onSendEmail={() => handleSendEmail(selectedInvoice)}
            isSendingWhatsApp={isWhatsAppLoading}
            isSendingEmail={isEmailLoading}
          />

          <MarkAsPaidDialog
            open={showMarkAsPaidDialog}
            onOpenChange={setShowMarkAsPaidDialog}
            invoice={selectedInvoice}
            onSuccess={handlePaymentSuccess}
            recordPayment={recordPayment}
          />

          <EscalateDialog
            open={showEscalateDialog}
            onOpenChange={setShowEscalateDialog}
            invoice={selectedInvoice}
            onSuccess={handleEscalationSuccess}
          />

          <SkipStepDialog
            open={showSkipStepDialog}
            onOpenChange={setShowSkipStepDialog}
            invoice={selectedInvoice}
            onSuccess={handleSkipStepSuccess}
          />
        </>
      )}

      <CollectionsSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />
    </div>
  )
}
