/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Target,
  CheckCircle2,
  Users,
  Briefcase,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart
} from 'lucide-react';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { CountUp } from "@/components/ui/count-up";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Workbook } from '@protobi/exceljs';
import { saveAs } from 'file-saver';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useUserRoles } from '@/hooks/useUserRoles';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type DateRange = '7days' | '30days' | '90days' | '1year' | 'all';

// Animation Variants - Simple & Professional
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const item = {
  hidden: { y: 10, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 }
  }
};

// Reusable Compact Card Component
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  description?: string;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  onClick?: () => void;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'neutral', 
  description, 
  className,
  variant = 'default',
  onClick 
}: StatCardProps) => {
  
  const styles = {
    default: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      trendUp: 'text-emerald-600',
      trendDown: 'text-red-600',
    },
    success: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      trendUp: 'text-emerald-600',
      trendDown: 'text-red-600',
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      trendUp: 'text-emerald-600',
      trendDown: 'text-red-600',
    },
    destructive: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      trendUp: 'text-emerald-600',
      trendDown: 'text-red-600',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trendUp: 'text-emerald-600',
      trendDown: 'text-red-600',
    }
  };

  const currentStyle = styles[variant] || styles.default;

  return (
    <motion.div
      variants={item}
      className={cn(
        "flex flex-col justify-between p-4 rounded-xl",
        "bg-card text-card-foreground border border-border/60 shadow-xs",
        "hover:shadow-sm hover:border-primary/20 transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate pr-2">{title}</p>
        
        {Icon && (
          <Icon className={cn("w-4 h-4 shrink-0", currentStyle.iconColor)} />
        )}
      </div>

      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/50",
            trendDirection === 'up' && currentStyle.trendUp,
            trendDirection === 'down' && currentStyle.trendDown,
            trendDirection === 'neutral' && "text-muted-foreground"
          )}>
            {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      {description && <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium truncate">{description}</p>}
    </motion.div>
  );
};

export default function ArchitectReportsPage() {
  useRouteTranslations();
  const { t, currency, language } = useLocalization();
  const { data: roles } = useUserRoles();
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const { projects } = useProjects();
  const { clients } = useClients();
  const { tasks } = useArchitectTasks();
  const { financialEntries } = useFinancialEntries();
  const { opportunities } = useSalesPipeline();

  // Filter data by date range
  const getDateThreshold = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case '7days': {
        const date = new Date(now);
        date.setDate(date.getDate() - 7);
        return date;
      }
      case '30days': {
        const date = new Date(now);
        date.setDate(date.getDate() - 30);
        return date;
      }
      case '90days': {
        const date = new Date(now);
        date.setDate(date.getDate() - 90);
        return date;
      }
      case '1year': {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() - 1);
        return date;
      }
      case 'all':
        return new Date(0); // Beginning of time
      default: {
        const date = new Date(now);
        date.setDate(date.getDate() - 30);
        return date;
      }
    }
  };

  const dateThreshold = getDateThreshold(dateRange);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Pipeline metrics
    const totalOpportunities = opportunities?.length || 0;
    const wonOpportunities = opportunities?.filter((opp) => opp.status === 'won').length || 0;
    const lostOpportunities = opportunities?.filter((opp) => opp.status === 'lost').length || 0;
    const activeOpportunities = opportunities?.filter((opp) => opp.status !== 'won' && opp.status !== 'lost').length || 0;

    const conversionRate = totalOpportunities > 0
      ? Math.round((wonOpportunities / totalOpportunities) * 100)
      : 0;

    // Pipeline value
    const totalPipelineValue = opportunities?.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) || 0;
    const wonValue = opportunities
        ?.filter((opp) => opp.status === 'won')
        .reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) || 0;

    // Project metrics
    const activeProjects = projects?.filter(
        (p) => new Date(p.created_at) >= dateThreshold && p.status !== 'completed' && p.status !== 'cancelled'
      ).length || 0;
    const completedProjects = projects?.filter(
        (p) => new Date(p.created_at) >= dateThreshold && p.status === 'completed'
      ).length || 0;

    // Task metrics
    const totalTasks = tasks?.filter((t) => new Date(t.created_at) >= dateThreshold).length || 0;
    const completedTasks = tasks?.filter(
        (t) => new Date(t.created_at) >= dateThreshold && t.status === 'completed'
      ).length || 0;
    const taskCompletionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    const overdueTasks = tasks?.filter(
        (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()
      ).length || 0;

    // Financial metrics
    const totalRevenue = financialEntries
        ?.filter((e) => e.entry_type === 'income' && new Date(e.entry_date) >= dateThreshold)
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalExpenses = financialEntries
        ?.filter((e) => e.entry_type === 'expense' && new Date(e.entry_date) >= dateThreshold)
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Client metrics
    const newClients = clients?.filter((c) => new Date(c.created_at) >= dateThreshold).length || 0;
    const totalClients = clients?.length || 0;

    return {
      totalOpportunities, wonOpportunities, lostOpportunities, activeOpportunities, conversionRate,
      totalPipelineValue, wonValue, activeProjects, completedProjects,
      totalTasks, completedTasks, taskCompletionRate, overdueTasks,
      totalRevenue, totalExpenses, netProfit, newClients, totalClients,
    };
  }, [opportunities, projects, tasks, financialEntries, clients, dateThreshold]);

  const formatCurrency = (value: number) => {
    const localeMap: Record<string, string> = {
      'en-US': 'en-US', 'pt-BR': 'pt-BR', 'es-ES': 'es-ES', 'fr-FR': 'fr-FR',
    };
    const locale = localeMap[language] || 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Architect Reports');

      // Add header
      worksheet.columns = [
        { header: t('architect.reports.excel.metric'), key: 'metric', width: 30 },
        { header: t('architect.reports.excel.value'), key: 'value', width: 20 },
      ];

      // Add data - Standard Logic
      worksheet.addRow({ metric: t('architect.reports.dateRangeLabel'), value: t(`architect.reports.dateRange.${dateRange}`) });
      worksheet.addRow({});
      worksheet.addRow({ metric: t('architect.reports.excel.pipelineMetrics'), value: '' });
      worksheet.addRow({ metric: t('architect.reports.totalOpportunities'), value: metrics.totalOpportunities });
      worksheet.addRow({ metric: t('architect.reports.wonOpportunities'), value: metrics.wonOpportunities });
      worksheet.addRow({ metric: t('architect.reports.conversionRate'), value: `${metrics.conversionRate}%` });
      worksheet.addRow({ metric: t('architect.reports.totalPipelineValue'), value: formatCurrency(metrics.totalPipelineValue) });
      worksheet.addRow({ metric: t('architect.reports.wonValue'), value: formatCurrency(metrics.wonValue) });
      worksheet.addRow({});
      worksheet.addRow({ metric: t('architect.reports.excel.projectMetrics'), value: '' });
      worksheet.addRow({ metric: t('architect.reports.activeProjects'), value: metrics.activeProjects });
      worksheet.addRow({ metric: t('architect.reports.completedProjects'), value: metrics.completedProjects });
      worksheet.addRow({});
      worksheet.addRow({ metric: t('architect.reports.excel.taskMetrics'), value: '' });
      worksheet.addRow({ metric: t('architect.reports.totalTasks'), value: metrics.totalTasks });
      worksheet.addRow({ metric: t('architect.reports.completed'), value: metrics.completedTasks });
      worksheet.addRow({ metric: t('architect.reports.taskCompletionRate'), value: `${metrics.taskCompletionRate}%` });
      worksheet.addRow({ metric: t('architect.reports.overdueTasks'), value: metrics.overdueTasks });
      worksheet.addRow({});
      worksheet.addRow({ metric: t('architect.reports.excel.financialMetrics'), value: '' });
      worksheet.addRow({ metric: t('architect.reports.totalRevenue'), value: formatCurrency(metrics.totalRevenue) });
      worksheet.addRow({ metric: t('architect.reports.totalExpenses'), value: formatCurrency(metrics.totalExpenses) });
      worksheet.addRow({ metric: t('architect.reports.netProfit'), value: formatCurrency(metrics.netProfit) });
      worksheet.addRow({});
      worksheet.addRow({ metric: t('architect.reports.excel.clientMetrics'), value: '' });
      worksheet.addRow({ metric: t('architect.reports.newClients'), value: metrics.newClients });
      worksheet.addRow({ metric: t('architect.reports.totalClients'), value: metrics.totalClients });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `architect-reports-${new Date().toISOString()}.xlsx`);
      toast.success(t('architect.reports.messages.exported'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('architect.reports.messages.error'));
    }
  };

  return (
    <div className="flex-1 space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Compact Header */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t('architect.reports.title')}
            </h1>
            <p className="text-white/80 font-medium text-sm max-w-2xl">
              {t('architect.reports.description')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[160px] bg-white/10 text-white border-white/20 hover:bg-white/20 h-9 text-sm rounded-lg font-medium transition-colors">
                <Calendar className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">{t('architect.reports.dateRange.7days')}</SelectItem>
                <SelectItem value="30days">{t('architect.reports.dateRange.30days')}</SelectItem>
                <SelectItem value="90days">{t('architect.reports.dateRange.90days')}</SelectItem>
                <SelectItem value="1year">{t('architect.reports.dateRange.1year')}</SelectItem>
                <SelectItem value="all">{t('architect.reports.dateRange.all')}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleExportExcel} 
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-9 px-4 text-sm rounded-lg font-medium shadow-sm transition-colors"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              {t('architect.reports.exportToExcel')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 px-1"
      >
        {/* Sales Pipeline - Compact Grid */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">{t('architect.reports.salesPipeline')}</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              title={t('architect.reports.totalPipelineValue')}
              value={formatCurrency(metrics.totalPipelineValue)}
              icon={DollarSign}
              variant="default"
              className="col-span-2 lg:col-span-2"
            />
            <StatCard
              title={t('architect.reports.wonValue')}
              value={formatCurrency(metrics.wonValue)}
              icon={CheckCircle2}
              variant="success"
              className="col-span-2 lg:col-span-2"
            />
            <StatCard
              title={t('architect.reports.conversionRate')}
              value={<>{metrics.conversionRate}%</>}
              icon={TrendingUp}
              variant="default"
              trendDirection={metrics.conversionRate > 20 ? 'up' : 'neutral'}
            />
            <StatCard
              title={t('architect.reports.activeOpportunities')}
              value={metrics.activeOpportunities}
              icon={Activity}
              variant="warning"
            />
          </div>
        </section>

        <Separator className="bg-border/50" />

        {/* Projects & Tasks - Compact Grid */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            <h2 className="text-lg font-bold tracking-tight">{t('architect.reports.projectsAndTasks')}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              title={t('architect.reports.activeProjects')}
              value={metrics.activeProjects}
              icon={Briefcase}
            />
            <StatCard
              title={t('architect.reports.completedProjects')}
              value={metrics.completedProjects}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title={t('architect.reports.taskCompletionRate')}
              value={<>{metrics.taskCompletionRate}%</>}
              icon={PieChart}
              variant="info"
              trendDirection={metrics.taskCompletionRate > 80 ? 'up' : 'neutral'}
            />
            <StatCard
              title={t('architect.reports.overdueTasks')}
              value={metrics.overdueTasks}
              icon={AlertCircle}
              variant={metrics.overdueTasks > 0 ? 'destructive' : 'success'}
            />
            
            {/* Quick Task Stats */}
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex flex-col justify-center items-center text-center">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{t('architect.reports.totalTasks')}</span>
                 <span className="text-lg font-bold text-foreground">{metrics.totalTasks}</span>
              </div>
               <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-center items-center text-center">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">{t('architect.reports.completed')}</span>
                 <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{metrics.completedTasks}</span>
              </div>
               <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 flex flex-col justify-center items-center text-center">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">{t('architect.reports.inProgress')}</span>
                 <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{metrics.totalTasks - metrics.completedTasks}</span>
              </div>
            </div>
          </div>
        </section>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Overview - Half Width */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h2 className="text-lg font-bold tracking-tight">{t('architect.reports.financialOverview')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title={t('architect.reports.totalRevenue')}
                value={formatCurrency(metrics.totalRevenue)}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title={t('architect.reports.totalExpenses')}
                value={formatCurrency(metrics.totalExpenses)}
                icon={ArrowDownRight}
                variant="destructive"
              />
              <StatCard
                title={t('architect.reports.netProfit')}
                value={formatCurrency(metrics.netProfit)}
                icon={DollarSign}
                variant={metrics.netProfit >= 0 ? "success" : "destructive"}
                className="col-span-2 border-l-4"
                trend={metrics.netProfit >= 0 ? "Net Profit" : "Net Loss"}
                trendDirection={metrics.netProfit >= 0 ? 'up' : 'down'}
              />
            </div>
          </section>

          {/* Client Metrics - Half Width */}
          <section className="space-y-3">
             <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-bold tracking-tight">{t('architect.reports.clientMetrics')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 h-full content-start">
              <StatCard
                title={t('architect.reports.newClients')}
                value={metrics.newClients}
                icon={Users}
                variant="success"
                description={t('architect.reports.inSelectedPeriod')}
              />
              <StatCard
                title={t('architect.reports.totalClients')}
                value={metrics.totalClients}
                icon={Users}
                variant="default"
              />
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
