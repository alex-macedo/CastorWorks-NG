/**
 * Story 4-9: Payment Dashboard with Due Date Alerts
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Dashboard for admins and accountants to manage supplier payments
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaymentDashboard, usePaymentStats } from '@/hooks/usePayments';
import { useLocalization } from "@/contexts/LocalizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Eye,
  CreditCard,
} from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

type FilterType = 'all' | 'due_week' | 'overdue' | 'completed';

export default function PaymentDashboard() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { data: payments = [], isLoading, refetch } = usePaymentDashboard(activeFilter);
  const { data: stats } = usePaymentStats();
  const { formatLongDate } = useDateFormat();

  const getAlertBadge = (alertLevel: string) => {
    switch (alertLevel) {
      case 'red':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('payments.alertLevel.red')}
          </Badge>
        );
      case 'orange':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('payments.alertLevel.orange')}
          </Badge>
        );
      case 'yellow':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
            <Calendar className="h-3 w-3" />
            {t('payments.alertLevel.yellow')}
          </Badge>
        );
      case 'green':
        return (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('payments.alertLevel.green')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'outline', label: t('payments.status.pending') },
      scheduled: { variant: 'secondary', label: t('payments.status.scheduled') },
      processing: { variant: 'default', label: t('payments.status.processing') },
      completed: { variant: 'default', label: t('payments.status.completed') },
      failed: { variant: 'destructive', label: t('payments.status.failed') },
      cancelled: { variant: 'outline', label: t('payments.status.cancelled') },
    };

    const config = statusMap[status] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleInitiatePayment = (paymentId: string) => {
    navigate(`/payments/${paymentId}/process`);
  };

  const handleViewDetails = (paymentId: string) => {
    navigate(`/payments/${paymentId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('payments.title')}</h1>
            <p className="text-muted-foreground">{t('payments.subtitle')}</p>
          </div>
          <Button variant="secondary" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Summary Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('payments.totalPending')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_pending}</div>
              <p className="text-xs text-muted-foreground">
                R$ {stats.total_amount_due.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('payments.overdue')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                R$ {stats.overdue_amount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('payments.dueThisWeek')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.due_this_week}
              </div>
              <p className="text-xs text-muted-foreground">{t('payments.requiresAttention')}</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('payments.onTrack')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total_pending - stats.overdue - stats.due_this_week}
              </div>
              <p className="text-xs text-muted-foreground">{t('payments.futurePayments')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)} variant="pill">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{t('payments.all')}</TabsTrigger>
          <TabsTrigger value="overdue">
            {t('payments.overdue')}
            {stats && stats.overdue > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.overdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="due_week">
            {t('payments.dueThisWeek')}
            {stats && stats.due_this_week > 0 && (
              <Badge className="ml-2 bg-orange-500">{stats.due_this_week}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">{t('payments.completed')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('payments.noPaymentsTitle')}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {activeFilter === 'overdue'
                    ? t('payments.emptyStates.overdue')
                    : activeFilter === 'due_week'
                    ? t('payments.emptyStates.dueThisWeek')
                    : activeFilter === 'completed'
                    ? t('payments.emptyStates.completed')
                    : t('payments.emptyStates.default')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{t('payments.paymentTransactions')}</CardTitle>
                <CardDescription>{t('payments.resultsFound', { count: payments.length })}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('payments.purchaseOrder')}</TableHead>
                        <TableHead>{t('payments.supplier')}</TableHead>
                        <TableHead>{t('payments.project')}</TableHead>
                        <TableHead className="text-right">{t('payments.amount')}</TableHead>
                        <TableHead>{t('payments.dueDate')}</TableHead>
                        <TableHead>{t('payments.alert')}</TableHead>
                        <TableHead>{t('payments.paymentStatus')}</TableHead>
                        <TableHead className="text-right">{t('payments.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const transactionId =
                          typeof payment.id === 'string' && payment.id.length > 0
                            ? payment.id
                            : undefined;
                        if (!transactionId) {
                          console.warn(
                            '[PaymentDashboard] Missing payment transaction ID for purchase order',
                            payment.purchase_order_id,
                            payment
                          );
                        }

                        return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {(payment as any).purchase_order_number || payment.purchase_order_id}
                          </TableCell>
                          <TableCell>{payment.supplier_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {payment.project_name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {payment.currency_id} {payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">
                                {formatLongDate(new Date(payment.due_date))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.is_overdue
                                  ? t('payments.daysOverdue', { count: Math.abs(payment.days_until_due) })
                                  : t('payments.dueInDays', { count: payment.days_until_due })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getAlertBadge(payment.alert_level)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {payment.status === 'pending' && (
                                <Button
                                  size="sm"
                                  disabled={!transactionId}
                                  className={!transactionId ? 'opacity-50 cursor-not-allowed' : undefined}
                                  onClick={() => transactionId && handleInitiatePayment(transactionId)}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {t('payments.pay')}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!transactionId}
                                className={!transactionId ? 'opacity-50 cursor-not-allowed' : undefined}
                                onClick={() => transactionId && handleViewDetails(transactionId)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
