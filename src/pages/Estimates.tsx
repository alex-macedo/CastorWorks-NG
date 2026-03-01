import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, DollarSign, User, Sparkles, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { formatDate } from '@/utils/reportFormatters';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const Estimates = () => {
  useRouteTranslations();
  const { t, dateFormat } = useLocalization();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);

  const { data: estimates, isLoading, error } = useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          id,
          name,
          description,
          status,
          total,
          ai_generated,
          ai_confidence_score,
          created_at,
          clients (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteEstimate = useMutation({
    mutationFn: async (estimateId: string) => {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('estimates.list.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setDeleteConfirmOpen(false);
      setEstimateToDelete(null);
    },
    onError: (error) => {
      toast.error(`${t('estimates.list.deleteError')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    return t(`estimates.list.status.${status}`) || status;
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("estimates.list.title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("estimates.list.subtitle")}</p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={() => navigate("/estimates/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("estimates.list.newButton")}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive">{t('estimates.list.error.title')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : t('estimates.list.error.unknown')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!estimates || estimates.length === 0) && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('estimates.list.empty.title')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('estimates.list.empty.description')}
              </p>
              <Button onClick={() => navigate('/estimates/new')} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t('estimates.list.empty.button')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimates Table */}
      {!isLoading && !error && estimates && estimates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('estimates.list.table.title', { count: estimates.length })}</CardTitle>
            <CardDescription>
              {t('estimates.list.table.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('estimates.list.table.columns.name')}</TableHead>
                  <TableHead>{t('estimates.list.table.columns.client')}</TableHead>
                  <TableHead>{t('estimates.list.table.columns.status')}</TableHead>
                  <TableHead className="text-right">{t('estimates.list.table.columns.total')}</TableHead>
                  <TableHead>{t('estimates.list.table.columns.created')}</TableHead>
                  <TableHead className="text-right">{t('estimates.list.table.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate) => (
                  <TableRow
                    key={estimate.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/estimates/${estimate.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{estimate.name}</div>
                          {estimate.ai_generated && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Sparkles className="h-3 w-3 text-yellow-500" />
                              {t('estimates.list.aiGenerated')}
                              {estimate.ai_confidence_score && (
                                <span>({estimate.ai_confidence_score}% {t('estimates.list.confidence')})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {estimate.clients ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{estimate.clients.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t('estimates.list.noClient')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(estimate.status)}>
                        {getStatusLabel(estimate.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(estimate.total)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        {formatDate(estimate.created_at, dateFormat)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/estimates/${estimate.id}`);
                          }}
                        >
                          {t('estimates.list.viewButton')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEstimateToDelete(estimate.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('estimates.list.deleteButton')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('estimates.list.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('estimates.list.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => estimateToDelete && deleteEstimate.mutate(estimateToDelete)}
            disabled={deleteEstimate.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEstimate.isPending ? t('estimates.list.deleting') : t('estimates.list.deleteConfirm')}
          </AlertDialogAction>
          <AlertDialogCancel>{t('estimates.detail.cancel')}</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Estimates;
