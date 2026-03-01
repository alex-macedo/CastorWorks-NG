import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import resolveStorageUrl from '@/utils/storage'
import { useToast } from '@/hooks/use-toast'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { POSummaryStats } from '@/components/PurchaseOrders/POSummaryStats'
import { POFilters, type POFiltersState } from '@/components/PurchaseOrders/POFilters'
import { POTableView, type SortConfig } from '@/components/PurchaseOrders/POTableView'
import { POCardView } from '@/components/PurchaseOrders/POCardView'
import { POEmptyState } from '@/components/PurchaseOrders/POEmptyState'
import { CreatePOSheet } from '@/components/PurchaseOrders/CreatePOSheet'
import { CreateSupplierSheet } from '@/components/PurchaseOrders/CreateSupplierSheet'
import { type POStatus } from '@/components/PurchaseOrders/POStatusBadge'
import { Loader2 } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useRouteTranslations } from '@/hooks/useRouteTranslations'

interface PurchaseOrder {
  id: string
  purchase_order_number: string
  total_amount: number
  currency_id: string
  status: POStatus
  created_at: string
  sent_at: string | null
  expected_delivery_date: string | null
  pdf_url: string | null
  project_id: string
  projects: {
    name: string
  }
  suppliers: {
    name: string
  }
}

interface Project {
  id: string
  name: string
}

interface ProjectTeamMembership {
  project_id: string
  projects: {
    id: string
    name: string
  } | null
}

export const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { t } = useLocalization()
  useRouteTranslations()
  const { purchaseOrders: rawPurchaseOrders, isLoading } = usePurchaseOrders()

  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  
  // Transform the purchase orders data
  const purchaseOrders: PurchaseOrder[] = useMemo(() => 
    ((rawPurchaseOrders || []) as any[]).map(po => ({
      id: po.id,
      purchase_order_number: po.purchase_order_number,
      total_amount: po.total_amount,
      currency_id: po.currency_id,
      status: po.status as POStatus,
      created_at: po.created_at,
      sent_at: po.sent_at,
      expected_delivery_date: po.expected_delivery_date,
      pdf_url: po.pdf_url,
      project_id: po.project_id,
      projects: { name: po.projects?.name || 'Unknown' },
      suppliers: { name: po.suppliers?.name || 'Unknown' }
    })), [rawPurchaseOrders]
  )

  const [filters, setFilters] = useState<POFiltersState>({
    status: 'all',
    project_id: 'all',
    search: '',
  })

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'created',
    direction: 'desc',
  })

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch accessible projects for filter
  const fetchProjects = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check user's roles - only allow PO creation for specific roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const roles = (userRoles || []).map(r => r.role)
      const allowedRoles = ['admin', 'project_manager', 'admin_office']
      const hasRequiredRole = roles.some(role => allowedRoles.includes(role))

      // If user doesn't have required role, return empty projects list
      if (!hasRequiredRole) {
        setProjects([])
        return
      }

      // Fetch projects user is a member of
      const { data: membershipData } = await supabase
        .from('project_team_members')
        .select('project_id, projects ( id, name )')
        .eq('user_id', user.id)

      const membershipProjects = (membershipData as ProjectTeamMembership[] | null) || []
      const uniqueProjectsMap = new Map<string, Project>()
      
      for (const membership of membershipProjects) {
        if (membership.projects) {
          uniqueProjectsMap.set(membership.projects.id, {
            id: membership.projects.id,
            name: membership.projects.name,
          })
        }
      }

      setProjects(Array.from(uniqueProjectsMap.values()))
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Read status filter from URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== 'all') {
      setFilters(prev => ({ ...prev, status: statusParam as POStatus }));
    }
  }, [searchParams]);
  const filteredAndSortedPOs = useMemo(() => {
    let result = [...(purchaseOrders as any[])]

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter((po: any) => po.status === filters.status)
    }

    // Apply project filter
    if (filters.project_id !== 'all') {
      result = result.filter((po: any) => po.project_id === filters.project_id)
    }

    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(
        (po: any) =>
          po.purchase_order_number.toLowerCase().includes(search) ||
          po.projects.name.toLowerCase().includes(search) ||
          po.suppliers.name.toLowerCase().includes(search)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortConfig.field) {
        case 'po_number':
          ;[aVal, bVal] = [a.purchase_order_number, b.purchase_order_number]
          break
        case 'project':
          ;[aVal, bVal] = [a.projects.name, b.projects.name]
          break
        case 'supplier':
          ;[aVal, bVal] = [a.suppliers.name, b.suppliers.name]
          break
        case 'amount':
          ;[aVal, bVal] = [a.total_amount, b.total_amount]
          break
        case 'created':
          ;[aVal, bVal] = [a.created_at, b.created_at]
          break
        case 'sent':
          ;[aVal, bVal] = [a.sent_at || '', b.sent_at || '']
          break
        case 'delivery':
          ;[aVal, bVal] = [
            a.expected_delivery_date || '',
            b.expected_delivery_date || '',
          ]
          break
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [purchaseOrders, filters, sortConfig])

  // Handle sorting
  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Handle view details
  const handleViewDetails = (id: string) => {
    navigate(`/purchase-orders/${id}`)
  }

  // Handle download PDF — resolve stored path to a signed URL before opening
  const handleDownloadPDF = async (po: PurchaseOrder) => {
    if (!po.pdf_url) {
      toast({
        title: t('procurement.pdfNotGenerated'),
        description: t('procurement.pdfNotGeneratedDescription'),
        variant: 'destructive',
      })
      return
    }

    try {
      const signed = await resolveStorageUrl(po.pdf_url)
      if (!signed) {
        toast({
          title: t('common.errorTitle'),
          description: t('procurement.pdfOpenError') || 'Unable to open PDF',
          variant: 'destructive',
        })
        return
      }
      window.open(signed, '_blank')
    } catch (err) {
      console.error('Error resolving pdf signed URL:', err)
      toast({
        title: t('common.errorTitle'),
        description: t('procurement.pdfOpenError') || 'Unable to open PDF',
        variant: 'destructive',
      })
    }
  }

  // Handle send email
  const handleSendEmail = async (po: PurchaseOrder) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: { purchase_order_id: po.id },
      })

      if (error) throw error

      toast({
        title: t('procurement.emailSent'),
        description: t('procurement.emailSentDescription'),
      })
    } catch (err) {
      console.error('Error sending email:', err)
      toast({
        title: t('common.errorTitle'),
        description: t('procurement.emailSendError'),
        variant: 'destructive',
      })
    }
  }

  // Handle regenerate PDF
  const handleRegeneratePDF = async (po: PurchaseOrder) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-po-pdf', {
        body: { purchase_order_id: po.id, force_regenerate: true },
      })

      if (error) throw error

      toast({
        title: t('procurement.pdfRegenerated'),
        description: t('procurement.pdfRegeneratedDescription'),
      })
    } catch (err) {
      console.error('Error regenerating PDF:', err)
      toast({
        title: t('common.errorTitle'),
        description: t('procurement.pdfRegenerateError'),
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('procurement.purchaseOrders')}</h1>
            <p className="text-sm text-muted-foreground">{t('procurement.purchaseOrdersSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateSupplierSheet />
            <CreatePOSheet projects={projects} />
          </div>
        </div>
      </SidebarHeaderShell>

      {(purchaseOrders as any[]).length > 0 && (
        <>
          <POSummaryStats purchaseOrders={purchaseOrders as any[]} />

          <POFilters
            filters={filters}
            onFiltersChange={setFilters}
            projects={projects}
          />

          {filteredAndSortedPOs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t('procurement.noPurchaseOrdersFiltered')}
              </p>
            </div>
          ) : isDesktop ? (
            <POTableView
              purchaseOrders={filteredAndSortedPOs as any[]}
              sortConfig={sortConfig}
              onSort={handleSort}
              onViewDetails={handleViewDetails}
              onDownloadPDF={handleDownloadPDF}
              onSendEmail={handleSendEmail}
              onRegeneratePDF={handleRegeneratePDF}
            />
          ) : (
            <POCardView
              purchaseOrders={filteredAndSortedPOs as any[]}
              onViewDetails={handleViewDetails}
              onDownloadPDF={handleDownloadPDF}
              onSendEmail={handleSendEmail}
            />
          )}
        </>
      )}

      {(purchaseOrders as any[]).length === 0 && !isLoading && <POEmptyState />}
    </div>
  )
}
