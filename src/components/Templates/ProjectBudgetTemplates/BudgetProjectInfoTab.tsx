import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Edit, 
  X, 
  Building2, 
  FileText, 
  Calculator, 
  MapPin, 
  Ruler, 
  Calendar, 
  CalendarCheck,
  ClipboardList,
  StickyNote,
  User,
  CheckCircle2,
  Clock,
  FileCheck,
  XCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseISO, format, isValid } from "date-fns";

import { useLocalization } from "@/contexts/LocalizationContext";
import { DateInput } from "@/components/ui/DateInput";

interface BudgetProjectInfoTabProps {
  budgetId: string;
  budget: any;
  project?: any;
}

// InfoItem component - extracted to prevent recreation on each render
const InfoItem = ({
  icon: Icon,
  label,
  value,
  className = ""
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${className}`}>
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5 truncate" title={value}>{value || '—'}</p>
    </div>
  </div>
);

export const BudgetProjectInfoTab = ({ budgetId, budget, project }: BudgetProjectInfoTabProps) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: budget?.name || '',
      description: budget?.description || '',
      notes: budget?.notes || '',
    },
  });

  const formatDateForInput = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '';
    
    try {
      let dateObj: Date;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string') {
        dateObj = parseISO(dateValue);
      } else {
        return '';
      }
      
      if (!isValid(dateObj)) return '';
      return format(dateObj, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const formatDateForDisplay = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '—';
    
    try {
      let dateObj: Date;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string') {
        dateObj = parseISO(dateValue);
      } else {
        return '—';
      }
      
      if (!isValid(dateObj)) return '—';
      return format(dateObj, 'MMM dd, yyyy');
    } catch {
      return '—';
    }
  };

  const parseNumberValue = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const sanitized = value.trim().replace(/\s+/g, '');
    if (!sanitized) return 0;
    const normalized = sanitized.includes(',') && sanitized.includes('.')
      ? sanitized.replace(/\./g, '').replace(',', '.')
      : sanitized.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const tgfaValue = useMemo(() => {
    const value = parseNumberValue(project?.total_gross_floor_area);
    return value ? value.toLocaleString() : '—';
  }, [project?.total_gross_floor_area]);

  const startDateValue = useMemo(() => formatDateForInput(project?.start_date), [project?.start_date]);
  const endDateValue = useMemo(() => formatDateForInput(project?.end_date), [project?.end_date]);
  const startDateDisplay = useMemo(() => formatDateForDisplay(project?.start_date), [project?.start_date]);
  const endDateDisplay = useMemo(() => formatDateForDisplay(project?.end_date), [project?.end_date]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          icon: Clock, 
          variant: 'secondary' as const, 
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
      case 'pending':
        return { 
          icon: Clock, 
          variant: 'secondary' as const, 
          className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700'
        };
      case 'approved':
        return { 
          icon: CheckCircle2, 
          variant: 'default' as const, 
          className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700'
        };
      case 'active':
        return { 
          icon: FileCheck, 
          variant: 'default' as const, 
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700'
        };
      case 'rejected':
        return { 
          icon: XCircle, 
          variant: 'destructive' as const, 
          className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700'
        };
      default:
        return { 
          icon: FileText, 
          variant: 'secondary' as const, 
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
        };
    }
  };

  const statusConfig = getStatusConfig(budget?.status || 'draft');
  const StatusIcon = statusConfig.icon;

  const updateBudget = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('project_budgets')
        .update({
          name: data.name,
          description: data.description,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-overview', budgetId] });
      setIsEditing(false);
      toast({
        title: t('common:success'),
        description: t('budgets:notifications.budgetUpdated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    updateBudget.mutate(data);
  };

  const handleCancel = () => {
    reset({
      name: budget?.name || '',
      description: budget?.description || '',
      notes: budget?.notes || '',
    });
    setIsEditing(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t('budgets:overview.projectInformation')}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('budgets:overview.projectInformationDesc')}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('common:edit')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={updateBudget.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateBudget.isPending ? t('common:saving') : t('common:save')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid - Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Column 1 - Budget Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t('budgets:editor.budgetDetails')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('budgets:editor.budgetDetailsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Budget Name - Editable */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {t('budgets:editor.name')}
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('budgets:editor.namePlaceholder')}
                  className="text-sm"
                />
              ) : (
                <div className="p-2.5 rounded-lg bg-muted/30 text-sm font-medium">
                  {budget?.name || '—'}
                </div>
              )}
            </div>

            {/* Description - Editable */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-medium flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                {t('budgets:editor.description')}
              </Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={2}
                  placeholder={t('budgets:editor.descriptionPlaceholder')}
                  className="text-sm resize-none"
                />
              ) : (
                <div className="p-2.5 rounded-lg bg-muted/30 text-sm min-h-[60px]">
                  {budget?.description || <span className="text-muted-foreground italic text-xs">{t('budgets:editor.descriptionPlaceholder')}</span>}
                </div>
              )}
            </div>

            {/* Notes - Editable */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-medium flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                {t('budgets:overview.notes')}
              </Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  placeholder={t('budgets:overview.notesPlaceholder')}
                  className="text-sm resize-none"
                />
              ) : (
                <div className="p-2.5 rounded-lg bg-muted/30 text-sm min-h-[70px]">
                  {budget?.notes || <span className="text-muted-foreground italic text-xs">{t('budgets:overview.notesPlaceholder')}</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2 - Status, Type & TGFA */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                {t('budgets:status.label')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge 
                variant={statusConfig.variant}
                className={`text-sm px-3 py-1.5 ${statusConfig.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                {t(`budgets:status.${budget?.status}` as any)}
              </Badge>
            </CardContent>
          </Card>

          {/* Budget Type Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                {t('budgets:editor.budgetType')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="outline" className="text-sm px-3 py-1.5 bg-primary/5">
                {t(`budgets:types.${budget?.budget_model}` as any)}
              </Badge>
            </CardContent>
          </Card>

          {/* Project Area Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                TGFA
              </CardTitle>
              <CardDescription className="text-xs">
                {t('budgets:overview.totalGrossFloorArea')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold text-primary">{tgfaValue} <span className="text-sm font-normal text-muted-foreground">m²</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Column 3 - Project Reference Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {t('budgets:overview.projectReference')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('budgets:overview.projectReferenceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem 
              icon={User} 
              label={t('budgets:overview.clientName')} 
              value={project?.client_name || project?.clients?.name || (Array.isArray(project?.clients) ? project?.clients[0]?.name : null) || '—'} 
            />
            <InfoItem 
              icon={MapPin} 
              label={t('budgets:overview.location')} 
              value={budget?.project_location || project?.city || project?.construction_address || '—'} 
            />
            <InfoItem 
              icon={Calendar} 
              label={t('budgets:overview.startDate')} 
              value={startDateDisplay} 
            />
            <InfoItem 
              icon={CalendarCheck} 
              label={t('budgets:overview.endDate')} 
              value={endDateDisplay} 
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
};
