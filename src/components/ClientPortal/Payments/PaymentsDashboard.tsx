import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  CreditCard,
  DollarSign,
  FileText,
  Search,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  CalendarClock
} from 'lucide-react';
import { MetricCard } from '../Shared/MetricCard';
import { PaymentModal } from '@/components/ClientPortal/Dialogs/PaymentModal';
import { InvoiceDetailsModal } from '@/components/ClientPortal/Dialogs/InvoiceDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useCreateConversation } from '@/hooks/clientPortal/useCreateConversation';
import { useProjectPayments } from '@/hooks/clientPortal/useProjectPayments';
import { toast } from 'sonner';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { FinancialEntryForm } from '@/components/Financial/FinancialEntryForm';
import { InstallmentsForm } from '@/components/Financial/InstallmentsForm';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

export function PaymentsDashboard() {
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { formatLongDate } = useDateFormat();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  // Do not create new conversations here — use existing chat mapping if available
  const { data: currentUser } = useCurrentUserProfile();
  const createConversation = useCreateConversation();
  const { invoices, isLoading } = useProjectPayments();

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  const isUuid = (value: unknown) => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  };

  // Calculate metrics
  const totalOutstanding = invoices
    .filter(i => i.status === 'due' || i.status === 'overdue')
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const paidLast30Days = invoices
    .filter(i => {
      if (i.status !== 'paid') return false;
      const issueDate = new Date(i.issue_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return issueDate >= thirtyDaysAgo;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'due': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return t("clientPortal.payments.statuses.paid");
      case 'due': return t("clientPortal.payments.statuses.due");
      case 'overdue': return t("clientPortal.payments.statuses.overdue");
      default: return status;
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting invoices...');
  };

  const handlePayNow = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    setShowPaymentModal(true);
  };

  const handleViewInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    setSelectedInvoice(invoiceId);
    setSelectedInvoiceObject(inv);
    // Open the invoice details sheet
    setShowInvoiceModal(true);
  };

  const handleCopyInvoice = (invoiceNumber: string) => {
    navigator.clipboard.writeText(invoiceNumber);
    // TODO: Show toast notification
  };

  const handleMakePayment = () => {
    setSelectedInvoice('');
    setShowPaymentModal(true);
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | undefined>(undefined);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceObject, setSelectedInvoiceObject] = useState<any | undefined>(undefined);

  // Form and dialog state for financial entries
  const [formOpen, setFormOpen] = useState(false);
  const [installmentsOpen, setInstallmentsOpen] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [editingEntry, setEditingEntry] = useState<any | undefined>();

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.payments.title", { defaultValue: "Payments & Invoices" })}
        subtitle={t("clientPortal.payments.description")}
      />

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title={t("clientPortal.payments.totalOutstanding")}
          value={`$${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description={t("clientPortal.payments.amountDue")}
          icon={DollarSign}
          className="bg-orange-50/50 dark:bg-orange-900/10"
          iconClassName="text-orange-600 bg-orange-100 dark:bg-orange-900/20"
        />
        <MetricCard
          title={t("clientPortal.payments.paidLast30")}
          value={`$${paidLast30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description={t("clientPortal.payments.recentPayments")}
          icon={CreditCard}
          className="bg-green-50/50 dark:bg-green-900/10"
          iconClassName="text-green-600 bg-green-100 dark:bg-green-900/20"
        />
        <MetricCard
          title={t("clientPortal.payments.overdueInvoices")}
          value={overdueCount}
          description={overdueCount > 0 ? t("clientPortal.payments.requiresAttention") : t("clientPortal.payments.allCaughtUp")}
          icon={FileText}
          className={overdueCount > 0 ? "bg-red-50/50 dark:bg-red-900/10" : ""}
          iconClassName={overdueCount > 0 ? "text-red-600 bg-red-100 dark:bg-red-900/20" : ""}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("clientPortal.payments.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">

          <Button
            className=""
            onClick={() => {
              setFormType("income");
              setEditingEntry(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("financial:newInvoice")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFormType("expense");
              setEditingEntry(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("financial:recordExpense")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setInstallmentsOpen(true)}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            {t("financial:installments.title")}
          </Button>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("clientPortal.payments.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clientPortal.payments.allStatuses")}</SelectItem>
              <SelectItem value="paid">{t("clientPortal.payments.statuses.paid")}</SelectItem>
              <SelectItem value="due">{t("clientPortal.payments.statuses.due")}</SelectItem>
              <SelectItem value="overdue">{t("clientPortal.payments.statuses.overdue")}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t("clientPortal.payments.export")}
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("clientPortal.payments.invoiceHistory.title")}</CardTitle>
          <CardDescription>
            {t("clientPortal.payments.invoiceHistory.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clientPortal.payments.tableHeaders.invoiceNumber")}</TableHead>
                    <TableHead>{t("clientPortal.payments.tableHeaders.projectName")}</TableHead>
                    <TableHead>{t("clientPortal.payments.tableHeaders.issueDate")}</TableHead>
                    <TableHead>{t("clientPortal.payments.tableHeaders.dueDate")}</TableHead>
                    <TableHead>{t("clientPortal.payments.tableHeaders.amount")}</TableHead>
                    <TableHead>{t("clientPortal.payments.tableHeaders.status")}</TableHead>
                    <TableHead className="text-right">{t("clientPortal.payments.tableHeaders.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.project_name}</TableCell>
                        <TableCell>{formatLongDate(invoice.issue_date)}</TableCell>
                        <TableCell>{formatLongDate(invoice.due_date)}</TableCell>
                        <TableCell>${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(invoice.status === 'due' || invoice.status === 'overdue') && (
                              <Button
                                size="sm"
                                onClick={() => handlePayNow(invoice.id)}
                              >
                                {t("clientPortal.payments.actions.payNow")}
                              </Button>
                            )}
                            {/* Conversation button - opens existing conversation for invoice if present */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  // If the invoice id is not a UUID, avoid querying a UUID-typed column
                                  if (!isUuid(invoice.id)) {
                                    // Attempt to create a conversation directly instead of querying mapping
                                    try {
                                      toast('Creating conversation for invoice...', { duration: 3000 });
                                      const members: string[] = [];
                                      if (currentUser?.id) members.push(currentUser.id);
                                      const res = await createConversation.mutateAsync(members);
                                      if (res?.id && projectId) {
                                        navigate(`/portal/${projectId}/chat/${res.id}`);
                                        return;
                                      }
                                    } catch (createErr: any) {
                                      console.error('Failed to auto-create conversation for non-UUID invoice id', createErr);
                                      if (projectId) {
                                        navigate(`/portal/${projectId}/chat`, { state: { invoiceId: invoice.id } });
                                        toast.error('Could not create conversation automatically; opened chat list instead.');
                                      }
                                      return;
                                    }
                                  }

                                  // Look for existing invoice_conversations mapping (only when invoice.id looks like a UUID)
                                  const { data: rows, error } = await supabase
                                    .from('invoice_conversations')
                                    .select('conversation_id')
                                    .eq('invoice_id', invoice.id)
                                    .limit(1)
                                    .maybeSingle();

                                  if (error) {
                                    // Handle Postgres 22P02 (invalid input syntax for uuid) gracefully
                                    if (error.code === '22P02' || (error.message || '').toLowerCase().includes('invalid input syntax for type uuid')) {
                                      try {
                                        toast('Invoice->conversation mapping invalid; creating conversation...', { duration: 3000 });
                                        const members: string[] = [];
                                        if (currentUser?.id) members.push(currentUser.id);
                                        const res = await createConversation.mutateAsync(members);
                                        if (res?.id && projectId) {
                                          navigate(`/portal/${projectId}/chat/${res.id}`);
                                          return;
                                        }
                                      } catch (createErr: any) {
                                        console.error('Failed to auto-create conversation after 22P02', createErr);
                                        if (projectId) {
                                          navigate(`/portal/${projectId}/chat`, { state: { invoiceId: invoice.id } });
                                          toast.error('Could not create conversation automatically; opened chat list instead.');
                                        }
                                        return;
                                      }
                                    }

                                    const msg = (error.message || '').toLowerCase();
                                    // If mapping table is missing, attempt to create a conversation directly
                                    if (msg.includes('could not find the table') || (msg.includes('relation') && msg.includes('does not exist'))) {
                                      try {
                                        toast('Invoice->conversation mapping not available; creating conversation...', { duration: 4000 });
                                        const members: string[] = [];
                                        if (currentUser?.id) members.push(currentUser.id);
                                        const res = await createConversation.mutateAsync(members);
                                        if (res?.id && projectId) {
                                          navigate(`/portal/${projectId}/chat/${res.id}`);
                                          return;
                                        }
                                      } catch (createErr: any) {
                                        console.error('Failed to auto-create conversation after missing mapping', createErr);
                                        // Fallback: open chat list so user can continue
                                        if (projectId) {
                                          navigate(`/portal/${projectId}/chat`, { state: { invoiceId: invoice.id } });
                                          toast.error('Could not create conversation automatically; opened chat list instead.');
                                        }
                                        return;
                                      }
                                    }

                                    throw error;
                                  }

                                  const convId = rows?.conversation_id;
                                  if (convId && projectId) {
                                    navigate(`/portal/${projectId}/chat/${convId}`);
                                    return;
                                  }

                                  // No dedicated conversation found - open chat list with invoiceId in state
                                  if (projectId) {
                                    navigate(`/portal/${projectId}/chat`, { state: { invoiceId: invoice.id } });
                                    toast('Opened chat list. Assistant will start the conversation if configured.');
                                  }
                                } catch (err: any) {
                                  console.error('Error opening conversation for invoice', err);
                                  // Generic fallback: show an error toast but still open chat list so user can continue
                                  toast.error(err?.message ?? 'Failed to open conversation');
                                  if (projectId) {
                                    navigate(`/portal/${projectId}/chat`, { state: { invoiceId: invoice.id } });
                                  }
                                }
                              }}
                            >
                              {t("clientPortal.payments.actions.conversation")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyInvoice(invoice.invoice_number)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewInvoice(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t("clientPortal.payments.noInvoices")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredInvoices.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t("clientPortal.payments.pagination.showing", {
                      from: ((page - 1) * pageSize) + 1,
                      to: Math.min(page * pageSize, filteredInvoices.length),
                      total: filteredInvoices.length
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t("clientPortal.payments.pagination.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t("clientPortal.payments.pagination.next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          invoices={invoices}
          selectedInvoiceId={selectedInvoice}
          onPaymentInitiated={(p) => {
            console.log('Payment initiated:', p);
            setShowPaymentModal(false);
          }}
        />

        <InvoiceDetailsModal
          open={showInvoiceModal}
          onOpenChange={(open) => {
            setShowInvoiceModal(open);
            if (!open) {
              setSelectedInvoice(undefined);
              setSelectedInvoiceObject(undefined);
            }
          }}
          invoice={selectedInvoiceObject}
          onPayNow={() => {
            if (!selectedInvoiceObject) return;
            setShowInvoiceModal(false);
            setSelectedInvoice(selectedInvoiceObject.id);
            setShowPaymentModal(true);
          }}
          onOpenConversation={async (id) => {
            try {
              // If the invoice id is not a UUID, attempt to create a conversation instead
              if (!isUuid(id)) {
                try {
                  toast('Creating conversation for invoice...', { duration: 3000 });
                  const members: string[] = [];
                  if (currentUser?.id) members.push(currentUser.id);
                  const res = await createConversation.mutateAsync(members);
                  if (res?.id && projectId) {
                    navigate(`/portal/${projectId}/chat/${res.id}`);
                    setShowInvoiceModal(false);
                    return;
                  }
                } catch (createErr: any) {
                  console.error('Failed to auto-create conversation for non-UUID invoice id', createErr);
                  if (projectId) {
                    navigate(`/portal/${projectId}/chat`, { state: { invoiceId: id } });
                    toast.error('Could not create conversation automatically; opened chat list instead.');
                  }
                  setShowInvoiceModal(false);
                  return;
                }
              }

              // Look for existing mapping in invoice_conversations
              const { data: mapping, error } = await supabase
                .from('invoice_conversations')
                .select('conversation_id')
                .eq('invoice_id', id)
                .limit(1)
                .maybeSingle();

              if (error) {
                // Handle invalid UUID input (22P02)
                if (error.code === '22P02' || (error.message || '').toLowerCase().includes('invalid input syntax for type uuid')) {
                  try {
                    toast('Invoice->conversation mapping invalid; creating conversation...', { duration: 3000 });
                    const members: string[] = [];
                    if (currentUser?.id) members.push(currentUser.id);
                    const res = await createConversation.mutateAsync(members);
                    if (res?.id && projectId) {
                      navigate(`/portal/${projectId}/chat/${res.id}`);
                      setShowInvoiceModal(false);
                      return;
                    }
                  } catch (createErr: any) {
                    console.error('Failed to auto-create conversation after 22P02', createErr);
                    if (projectId) navigate(`/portal/${projectId}/chat`, { state: { invoiceId: id } });
                    setShowInvoiceModal(false);
                    return;
                  }
                }

                throw error;
              }

              const convId = mapping?.conversation_id;
              if (convId && projectId) {
                // Trigger AI mediator (best-effort) to start assistant message about this invoice
                try {
                  await fetch('/supabase/functions/v1/ai-conversation-mediator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: id, conversation_id: convId, trigger: 'user_open' })
                  });
                } catch (err) {
                  console.warn('AI mediator call failed', err);
                }

                navigate(`/portal/${projectId}/chat/${convId}`);
                setShowInvoiceModal(false);
                return;
              }

              // No mapping - navigate to chat list with invoiceId in state (do NOT create new conversation)
              if (projectId) {
                navigate(`/portal/${projectId}/chat`, { state: { invoiceId: id } });
                toast('Opened chat list. If an assistant is configured it may start the conversation.');
              }
            } catch (err: any) {
              console.error('Failed to open conversation for invoice', err);
              toast.error(err?.message ?? 'Failed to open conversation');
              if (projectId) navigate(`/portal/${projectId}/chat`, { state: { invoiceId: id } });
            } finally {
              setShowInvoiceModal(false);
            }
          }}
        />

      {/* Financial Entry Form Dialog */}
      <FinancialEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultType={formType}
        entry={editingEntry}
      />

      {/* Installments Form Dialog */}
      <InstallmentsForm
        open={installmentsOpen}
        onOpenChange={setInstallmentsOpen}
      />

      {/* Removed global "Make a Payment" button per request */}
    </div>
  );
}
