/**
 * Payment Management Component
 * Phase 2g: CastorWorks Pay - Payment Links & Installments
 * 
 * Unified interface for managing payment links and installment plans
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { PageHeader } from '@/components/Layout/PageHeader'
import { 
  CreditCard, 
  Link, 
  Calendar, 
  Building2,
  Copy, 
  ExternalLink,
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  usePaymentLinks, 
  useCreatePaymentLink,
  useCancelPaymentLink,
} from '@/hooks/usePaymentLinks'
import { 
  useInstallmentPlans, 
  useInstallmentItems,
  useCreateInstallmentPlan,
  useRecordPayment,
  useCancelInstallmentPlan
} from '@/hooks/useInstallmentPlans'
import { useProjects } from '@/hooks/useProjects'
import { formatCurrency } from '@/utils/formatters'
import { useLocalization } from '@/contexts/LocalizationContext'
import { z } from 'zod'

// Payment Link Form Schema
const paymentLinkSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_cpf_cnpj: z.string().optional(),
  allow_pix: z.boolean().default(true),
  allow_boleto: z.boolean().default(true),
  allow_credit_card: z.boolean().default(false),
  allow_bank_transfer: z.boolean().default(false),
  expires_at: z.string().optional(),
})

type PaymentLinkFormValues = z.infer<typeof paymentLinkSchema>

// Installment Plan Form Schema
const installmentPlanSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  total_amount: z.coerce.number().positive('Amount must be positive'),
  num_installments: z.coerce.number().int().min(2).max(48),
  first_due_date: z.string().min(1, 'First due date is required'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).default('monthly'),
  customer_name: z.string().optional(),
  customer_cpf_cnpj: z.string().optional(),
})

type InstallmentPlanFormValues = z.infer<typeof installmentPlanSchema>

interface PaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function PaymentLinkDialog({ open, onOpenChange, onSuccess }: PaymentLinkDialogProps) {
  const { t } = useTranslation(['financial', 'common'])
  const { currency } = useLocalization()
  const { projects = [] } = useProjects()
  const createPaymentLink = useCreatePaymentLink()
  
  const [formData, setFormData] = useState<PaymentLinkFormValues>({
    project_id: '',
    amount: 0,
    description: '',
    customer_name: '',
    customer_email: '',
    customer_cpf_cnpj: '',
    allow_pix: true,
    allow_boleto: true,
    allow_credit_card: false,
    allow_bank_transfer: false,
    expires_at: '',
  })

  const { data: projectWithClient } = useQuery({
    queryKey: ['project-client', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return null
      const { data, error } = await supabase
        .from('projects')
        .select('id, client_id, clients(id, name, email, cpf)')
        .eq('id', formData.project_id)
        .single()
      if (error || !data) return null
      return data
    },
    enabled: !!formData.project_id && open,
  })

  const clientFromProject = projectWithClient?.clients as { name?: string; email?: string; cpf?: string } | null
  const hasClientData = !!clientFromProject && (!!clientFromProject.name || !!clientFromProject.email || !!clientFromProject.cpf)

  useEffect(() => {
    if (clientFromProject && formData.project_id) {
      setFormData(prev => ({
        ...prev,
        customer_name: clientFromProject.name ?? prev.customer_name,
        customer_email: clientFromProject.email ?? prev.customer_email,
        customer_cpf_cnpj: clientFromProject.cpf ?? prev.customer_cpf_cnpj,
      }))
    } else if (!formData.project_id) {
      setFormData(prev => ({
        ...prev,
        customer_name: '',
        customer_email: '',
        customer_cpf_cnpj: '',
      }))
    }
  }, [formData.project_id, projectWithClient, clientFromProject])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormData({
        project_id: '',
        amount: 0,
        description: '',
        customer_name: '',
        customer_email: '',
        customer_cpf_cnpj: '',
        allow_pix: true,
        allow_boleto: true,
        allow_credit_card: false,
        allow_bank_transfer: false,
        expires_at: '',
      })
    }
    prevOpenRef.current = open
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPaymentLink.mutateAsync(formData)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating payment link:', error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('financial:paymentLinks.create', 'Create Payment Link')}</SheetTitle>
          <SheetDescription>
            {t('financial:paymentLinks.createDescription', 'Generate a payment link for your customer')}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>{t('financial:common.project', 'Project')}</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('financial:common.selectProject', 'Select project')} />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('financial:common.amount', 'Amount')}</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              placeholder={t('financial:common.amountPlaceholder', '0.00')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('financial:common.description', 'Description')}</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('financial:paymentLinks.descriptionPlaceholder', 'Payment description')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('financial:common.customerName', 'Customer Name')}</Label>
            <Input
              className="w-full min-w-0"
              value={formData.customer_name || ''}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              disabled={hasClientData}
              readOnly={hasClientData}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('financial:common.customerEmail', 'Customer Email')}</Label>
            <Input
              type="email"
              className="w-full min-w-0"
              value={formData.customer_email || ''}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              disabled={hasClientData}
              readOnly={hasClientData}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('financial:common.customerDocument', 'CPF/CNPJ')}</Label>
            <Input
              value={formData.customer_cpf_cnpj || ''}
              onChange={(e) => setFormData({ ...formData, customer_cpf_cnpj: e.target.value })}
              placeholder={t('financial:common.customerDocumentPlaceholder', '000.000.000-00')}
              disabled={hasClientData}
              readOnly={hasClientData}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('financial:paymentLinks.paymentMethods', 'Payment Methods')}</Label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_pix}
                  onChange={(e) => setFormData({ ...formData, allow_pix: e.target.checked })}
                />
                PIX
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_boleto}
                  onChange={(e) => setFormData({ ...formData, allow_boleto: e.target.checked })}
                />
                Boleto
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_credit_card}
                  onChange={(e) => setFormData({ ...formData, allow_credit_card: e.target.checked })}
                />
                {t('financial:paymentLinks.creditCard', 'Credit Card')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_bank_transfer}
                  onChange={(e) => setFormData({ ...formData, allow_bank_transfer: e.target.checked })}
                />
                {t('financial:paymentLinks.bankTransfer', 'Bank Transfer')}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('financial:paymentLinks.expiresAt', 'Expires At')}</Label>
            <Input
              type="datetime-local"
              value={formData.expires_at || ''}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={createPaymentLink.isPending}>
              {createPaymentLink.isPending ? t('common:loading', 'Loading...') : t('financial:paymentLinks.create', 'Create Link')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function InstallmentPlanDialog({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const { t } = useTranslation(['financial', 'common'])
  const { currency } = useLocalization()
  const { projects = [] } = useProjects()
  const createPlan = useCreateInstallmentPlan()

  const [formData, setFormData] = useState<InstallmentPlanFormValues>({
    project_id: '',
    total_amount: 0,
    num_installments: 12,
    first_due_date: '',
    frequency: 'monthly',
    customer_name: '',
    customer_cpf_cnpj: '',
  })

  const { data: projectWithClient } = useQuery({
    queryKey: ['project-client', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return null
      const { data, error } = await supabase
        .from('projects')
        .select('id, client_id, clients(id, name, email, cpf)')
        .eq('id', formData.project_id)
        .single()
      if (error || !data) return null
      return data
    },
    enabled: !!formData.project_id && open,
  })

  const clientFromProject = projectWithClient?.clients as { name?: string; email?: string; cpf?: string } | null
  const hasClientData = !!clientFromProject && (!!clientFromProject.name || !!clientFromProject.email || !!clientFromProject.cpf)

  useEffect(() => {
    if (clientFromProject && formData.project_id) {
      setFormData(prev => ({
        ...prev,
        customer_name: clientFromProject.name ?? prev.customer_name,
        customer_cpf_cnpj: clientFromProject.cpf ?? prev.customer_cpf_cnpj,
      }))
    } else if (!formData.project_id) {
      setFormData(prev => ({
        ...prev,
        customer_name: '',
        customer_cpf_cnpj: '',
      }))
    }
  }, [formData.project_id, projectWithClient, clientFromProject])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormData({
        project_id: '',
        total_amount: 0,
        num_installments: 12,
        first_due_date: '',
        frequency: 'monthly',
        customer_name: '',
        customer_cpf_cnpj: '',
      })
    }
    prevOpenRef.current = open
  }, [open])

  const installmentAmount = formData.total_amount / (formData.num_installments || 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPlan.mutateAsync(formData)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating installment plan:', error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('financial:installments.create', 'Create Installment Plan')}</SheetTitle>
          <SheetDescription>
            {t('financial:installments.createDescription', 'Create a structured payment plan')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>{t('financial:common.project', 'Project')}</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('financial:common.selectProject', 'Select project')} />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('financial:common.totalAmount', 'Total Amount')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                placeholder={t('financial:common.amountPlaceholder', '0.00')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('financial:installments.numberOfInstallments', 'Installments')}</Label>
              <Input
                type="number"
                min="2"
                max="48"
                value={formData.num_installments}
                onChange={(e) => setFormData({ ...formData, num_installments: parseInt(e.target.value) })}
                placeholder={t('financial:installments.numberOfInstallmentsPlaceholder', '2')}
              />
            </div>
          </div>

          {formData.total_amount > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">{t('financial:installments.perInstallment', 'Per installment')}: </span>
              <span className="font-medium">{formatCurrency(installmentAmount, currency)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('financial:installments.firstDueDate', 'First Due Date')}</Label>
              <Input
                type="date"
                value={formData.first_due_date}
                onChange={(e) => setFormData({ ...formData, first_due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('financial:installments.frequency', 'Frequency')}</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => 
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('financial:installments.weekly', 'Weekly')}</SelectItem>
                  <SelectItem value="biweekly">{t('financial:installments.biweekly', 'Bi-weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('financial:installments.monthly', 'Monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('financial:common.customerName', 'Customer Name')}</Label>
            <Input
              className="w-full min-w-0"
              value={formData.customer_name || ''}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              disabled={hasClientData}
              readOnly={hasClientData}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('financial:common.customerDocument', 'CPF/CNPJ')}</Label>
            <Input
              className="w-full min-w-0"
              value={formData.customer_cpf_cnpj || ''}
              onChange={(e) => setFormData({ ...formData, customer_cpf_cnpj: e.target.value })}
              placeholder={t('financial:common.customerDocumentPlaceholder', '000.000.000-00')}
              disabled={hasClientData}
              readOnly={hasClientData}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? t('common:loading', 'Loading...') : t('financial:installments.create', 'Create Plan')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function PaymentLinkCard({
  link,
  onCopy,
  onCancel
}: {
  link: any
  onCopy: (code: string) => void
  onCancel: (id: string) => void
}) {
  const { t } = useTranslation(['financial', 'common'])
  const { currency } = useLocalization()

  const statusColors = {
    active: 'bg-green-500',
    expired: 'bg-gray-500',
    paid: 'bg-blue-500',
    cancelled: 'bg-red-500',
  }

  const statusIcons = {
    active: <CheckCircle2 className="h-4 w-4" />,
    expired: <Clock className="h-4 w-4" />,
    paid: <CheckCircle2 className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{link.link_code}</span>
          </div>
          <Badge className={statusColors[link.status]}>
            {statusIcons[link.status]}
            <span className="ml-1">{String(t(`financial:paymentLinks.status.${link.status}`, link.status))}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('financial:common.amount', 'Amount')}</span>
            <span className="font-medium">{formatCurrency(link.amount, link.currency || currency)}</span>
          </div>
          {link.customer_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('financial:common.customer', 'Customer')}</span>
              <span>{link.customer_name}</span>
            </div>
          )}
          {link.description && (
            <p className="text-sm text-muted-foreground">{link.description}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(link.link_code)}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-1" />
              {t('financial:paymentLinks.copyLink', 'Copy Link')}
            </Button>
            {link.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(link.id)}
              >
                {t('common:cancel', 'Cancel')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InstallmentPlanCard({
  plan,
  onRecordPayment,
  onCancel
}: {
  plan: any
  onRecordPayment: (itemId: string, amount: number) => void
  onCancel: (id: string) => void
}) {
  const { t } = useTranslation(['financial', 'common'])
  const { currency } = useLocalization()
  const { data: items } = useInstallmentItems(plan.id)

  const progress = (plan.installments_paid / plan.num_installments) * 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {plan.num_installments}x {t('financial:installments.installments', 'installments')}
            </span>
          </div>
          <Badge variant={plan.status === 'completed' ? 'default' : 'outline'}>
            {plan.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('financial:common.total', 'Total')}</span>
            <span className="font-medium">{formatCurrency(plan.total_amount, plan.currency || currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('financial:installments.paid', 'Paid')}</span>
            <span className="text-green-600">{formatCurrency(plan.total_paid, plan.currency || currency)}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {plan.installments_paid} / {plan.num_installments} {t('financial:installments.paid', 'paid')}
          </p>

          {plan.customer_name && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t('financial:common.customer', 'Customer')}: </span>
              {plan.customer_name}
            </p>
          )}

          {plan.status === 'active' && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(plan.id)}
              >
                {t('common:cancel', 'Cancel')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PaymentManagement() {
  const { t } = useTranslation('financial')
  const [activeTab, setActiveTab] = useState<'links' | 'installments'>('links')
  const [paymentLinkDialogOpen, setPaymentLinkDialogOpen] = useState(false)
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false)

  const { data: paymentLinks } = usePaymentLinks()
  const { data: installmentPlans } = useInstallmentPlans()
  const cancelPaymentLink = useCancelPaymentLink()
  const cancelInstallmentPlan = useCancelInstallmentPlan()
  const recordPayment = useRecordPayment()

  const handleCopyLink = async (code: string) => {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/pay/${code}`
    await navigator.clipboard.writeText(url)
  }

  const handleCancelPaymentLink = async (id: string) => {
    await cancelPaymentLink.mutateAsync(id)
  }

  const handleCancelInstallmentPlan = async (id: string) => {
    await cancelInstallmentPlan.mutateAsync(id)
  }

  const handleRecordPayment = async (itemId: string, amount: number) => {
    await recordPayment.mutateAsync({
      itemId,
      paidAmount: amount,
    })
  }

  const handleCreateClick = () => {
    if (activeTab === 'links') {
      setPaymentLinkDialogOpen(true)
    } else {
      setInstallmentDialogOpen(true)
    }
  }

  const createButtonLabel = t('paymentManagement.create', 'Create')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('financial:paymentManagement.title', 'Payment Management')}
        description={t('financial:paymentManagement.description', 'Create shareable payment links for one-time payments and set up installment plans to split costs into recurring installments.')}
        actions={
          <Button variant="glass-style-white" onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            {createButtonLabel}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'links' ? 'glass-style-dark' : 'glass-style-white'}
          onClick={() => setActiveTab('links')}
        >
          <Link className="h-4 w-4 mr-2" />
          {t('paymentLinks.title', 'Payment Links')}
        </Button>
        <Button
          variant={activeTab === 'installments' ? 'glass-style-dark' : 'glass-style-white'}
          onClick={() => setActiveTab('installments')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {t('installments.title', 'Installment Plans')}
        </Button>
      </div>

      {/* Payment Links Tab */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <PaymentLinkDialog
            open={paymentLinkDialogOpen}
            onOpenChange={setPaymentLinkDialogOpen}
          />

          {paymentLinks && paymentLinks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentLinks.map((link) => (
                <PaymentLinkCard
                  key={link.id}
                  link={link}
                  onCopy={handleCopyLink}
                  onCancel={handleCancelPaymentLink}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('financial:paymentLinks.empty', 'No payment links yet')}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setPaymentLinkDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('financial:paymentLinks.createFirst', 'Create your first payment link')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Installments Tab */}
      {activeTab === 'installments' && (
        <div className="space-y-4">
          <InstallmentPlanDialog
            open={installmentDialogOpen}
            onOpenChange={setInstallmentDialogOpen}
          />

          {installmentPlans && installmentPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installmentPlans.map((plan) => (
                <InstallmentPlanCard
                  key={plan.id}
                  plan={plan}
                  onRecordPayment={handleRecordPayment}
                  onCancel={handleCancelInstallmentPlan}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('financial:installments.empty', 'No installment plans yet')}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setInstallmentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('financial:installments.createFirst', 'Create your first installment plan')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentManagement
