import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { EstimateLineItemTable, LineItem } from '@/components/Estimates/EstimateLineItemTable';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useToast } from '@/hooks/use-toast';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import {
  ArrowLeft,
  Save,
  Copy,
  Trash2,
  FileDown,
  Send,
  Sparkles,
  Calendar,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  History,
  FilePlus,
} from 'lucide-react';

interface EstimateData {
  id: string;
  user_id: string;
  project_id?: string;
  client_id?: string;
  version: number;
  parent_estimate_id?: string;
  name: string;
  description: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  markup_percentage: number;
  total: number;
  ai_generated: boolean;
  ai_context: any;
  ai_confidence_score?: number;
  ai_model?: string;
  expires_at?: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
  };
  projects?: {
    id: string;
    name: string;
  };
}

const EstimateDetail = () => {
  useRouteTranslations();
  const { t, dateFormat } = useLocalization();
  // formatDate is imported from reportFormatters and uses dateFormat from useLocalization
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [status, setStatus] = useState<EstimateData['status']>('draft');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Fetch estimate data
  const { data: estimate, isLoading, error } = useQuery({
    queryKey: ['estimate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          clients (id, name),
          projects (id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as EstimateData;
    },
    enabled: !!id,
  });

  // Initialize form state when estimate loads
  useEffect(() => {
    if (!estimate) return;
    const nextName = estimate.name || '';
    const nextDescription = estimate.description || '';
    const nextLineItems = estimate.line_items || [];
    const nextMarkup = estimate.markup_percentage || 0;
    const nextTax = estimate.tax_rate || 0;
    const nextStatus = estimate.status;

    if (
      nextName !== name ||
      nextDescription !== description ||
      JSON.stringify(nextLineItems) !== JSON.stringify(lineItems) ||
      nextMarkup !== markupPercentage ||
      nextTax !== taxRate ||
      nextStatus !== status
    ) {
      setName(nextName);
      setDescription(nextDescription);
      setLineItems(nextLineItems);
      setMarkupPercentage(nextMarkup);
      setTaxRate(nextTax);
      setStatus(nextStatus);
    }
  }, [estimate, name, description, lineItems, markupPercentage, taxRate, status]);

  const hasChanges = useMemo(() => {
    if (!estimate) return false;
    return (
      name !== (estimate.name || '') ||
      description !== (estimate.description || '') ||
      JSON.stringify(lineItems) !== JSON.stringify(estimate.line_items || []) ||
      markupPercentage !== (estimate.markup_percentage || 0) ||
      taxRate !== (estimate.tax_rate || 0) ||
      status !== estimate.status
    );
  }, [name, description, lineItems, markupPercentage, taxRate, status, estimate]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('estimates')
        .update({
          name,
          description,
          line_items: lineItems,
          markup_percentage: markupPercentage,
          tax_rate: taxRate,
          status,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast({
        title: t('estimates.detail.saved'),
        description: t('estimates.detail.savedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('estimates.detail.saveFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast({
        title: t('estimates.detail.deleted'),
        description: t('estimates.detail.deletedDescription'),
      });
      navigate('/estimates');
    },
    onError: (error) => {
      toast({
        title: t('estimates.detail.deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!estimate) throw new Error('No estimate to duplicate');

      const { data, error } = await supabase
        .from('estimates')
        .insert({
          user_id: estimate.user_id,
          project_id: estimate.project_id,
          client_id: estimate.client_id,
          name: `${estimate.name} (Copy)`,
          description: estimate.description,
          line_items: estimate.line_items,
          markup_percentage: estimate.markup_percentage,
          tax_rate: estimate.tax_rate,
          ai_generated: estimate.ai_generated,
          ai_context: estimate.ai_context,
          ai_confidence_score: estimate.ai_confidence_score,
          ai_model: estimate.ai_model,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast({
        title: t('estimates.detail.duplicated'),
        description: t('estimates.detail.duplicatedDescription'),
      });
      navigate(`/estimates/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: t('estimates.detail.duplicateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('estimates.detail.notFound')}</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : t('estimates.detail.notFoundDescription')}
              </p>
              <Button onClick={() => navigate('/estimates')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('estimates.detail.backToList')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/estimates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SidebarHeaderShell>
<div>
            <h1 className="text-3xl font-bold">{t('estimates.detail.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('estimates.detail.lastUpdated')}: {formatDate(estimate.updated_at, dateFormat)}
            </p>
          </div>
</SidebarHeaderShell>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              {t('estimates.detail.unsavedChanges')}
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => setShowDuplicateDialog(true)}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('estimates.detail.duplicate')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/estimates/${id}/proposal`)}
          >
            <FilePlus className="h-4 w-4 mr-2" />
            {t('estimates.review.createProposal')}
          </Button>
          {estimate.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('estimates.detail.delete')}
            </Button>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? t('estimates.detail.saving') : t('estimates.detail.save')}
          </Button>
        </div>
      </div>

      {/* Metadata Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold h-auto p-2"
                placeholder={t('estimates.detail.namePlaceholder')}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm text-muted-foreground mt-2 min-h-[80px]"
                placeholder={t('estimates.detail.descriptionPlaceholder')}
              />
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <Select value={status} onValueChange={(val) => setStatus(val as EstimateData['status'])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <Badge variant="outline" className={getStatusColor('draft')}>
                      {t('estimates.list.status.draft')}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="sent">
                    <Badge variant="outline" className={getStatusColor('sent')}>
                      {t('estimates.list.status.sent')}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="viewed">
                    <Badge variant="outline" className={getStatusColor('viewed')}>
                      {t('estimates.detail.status.viewed')}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="accepted">
                    <Badge variant="outline" className={getStatusColor('accepted')}>
                      {t('estimates.detail.status.accepted')}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <Badge variant="outline" className={getStatusColor('rejected')}>
                      {t('estimates.list.status.rejected')}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="expired">
                    <Badge variant="outline" className={getStatusColor('expired')}>
                      {t('estimates.detail.status.expired')}
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
              {estimate.ai_generated && (
                <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-blue-100 dark:from-blue-900 dark:to-blue-900">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('estimates.list.aiGenerated')}
                  {estimate.ai_confidence_score && ` ${estimate.ai_confidence_score}%`}
                </Badge>
              )}
              {estimate.version > 1 && (
                <Badge variant="outline">
                  <History className="h-3 w-3 mr-1" />
                  v{estimate.version}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {estimate.clients && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('estimates.detail.client')}</p>
                  <p className="font-medium">{estimate.clients.name}</p>
                </div>
              </div>
            )}
            {estimate.projects && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('estimates.detail.project')}</p>
                  <p className="font-medium">{estimate.projects.name}</p>
                </div>
              </div>
            )}
            {estimate.ai_context?.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('estimates.detail.location')}</p>
                  <p className="font-medium">{estimate.ai_context.location}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('estimates.detail.created')}</p>
                <p className="font-medium">{formatDate(estimate.created_at, dateFormat)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t('estimates.detail.lineItemsTitle')}</CardTitle>
          <CardDescription>{t('estimates.detail.lineItemsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <EstimateLineItemTable
            lineItems={lineItems}
            onChange={setLineItems}
            markupPercentage={markupPercentage}
            onMarkupChange={setMarkupPercentage}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
          />
        </CardContent>
      </Card>

      {/* AI Context (if available) */}
      {estimate.ai_context && Object.keys(estimate.ai_context).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {t('estimates.detail.aiContext')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimate.ai_context.assumptions && estimate.ai_context.assumptions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">{t('estimates.review.assumptions')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {estimate.ai_context.assumptions.map((assumption: string, idx: number) => (
                    <li key={idx}>{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
            {estimate.ai_context.recommendations && estimate.ai_context.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">{t('estimates.review.recommendations')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {estimate.ai_context.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('estimates.detail.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('estimates.detail.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('estimates.detail.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('estimates.detail.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('estimates.detail.duplicateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('estimates.detail.duplicateConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('estimates.detail.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => duplicateMutation.mutate()}>
              {t('estimates.detail.duplicateConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EstimateDetail;
