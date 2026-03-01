import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Eye,
  CalendarClock,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Bar } from "recharts/es6/cartesian/Bar";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useFinancialARWorkspace } from "@/hooks/useFinancialARWorkspace";
import { formatCurrency } from "@/utils/formatters";
import { formatDateSystem } from "@/utils/dateSystemFormatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { CompactValue } from "@/components/ui/compact-value";
import { useMemo, useState, type ReactNode } from "react";
import { FinancialEntryForm } from "@/components/Financial/FinancialEntryForm";
import { TransactionDetailsDialog } from "@/components/Financial/TransactionDetailsDialog";
import { FinancialAIInsightsPanel } from "@/components/Financial/FinancialAIInsightsPanel";
import { InstallmentsForm } from "@/components/Financial/InstallmentsForm";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PeriodFilter = "last30" | "last90" | "last365" | "all";

const PERIOD_DAYS: Record<Exclude<PeriodFilter, "all">, number> = {
  last30: 30,
  last90: 90,
  last365: 365,
};

const getPeriodStartDate = (period: PeriodFilter): Date | null => {
  if (period === "all") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - PERIOD_DAYS[period]);
  return now;
};

interface FinancialKpiCardProps {
  title: string;
  icon: ReactNode;
  compactValue: string;
  fullValue: string;
  tooltipLabel: string;
  tooltipFormula: string;
  tooltipPeriod: string;
  tooltipSource: string;
}

const FinancialKpiCard = ({
  title,
  icon,
  compactValue,
  fullValue,
  tooltipLabel,
  tooltipFormula,
  tooltipPeriod,
  tooltipSource,
}: FinancialKpiCardProps) => {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[10px] leading-tight text-muted-foreground truncate">{title}</p>
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label={tooltipLabel}
                  >
                    <CircleHelp className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-xs">{tooltipFormula}</p>
                  <p className="text-xs">{tooltipPeriod}</p>
                  <p className="text-xs">{tooltipSource}</p>
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
          </div>
          <div className="p-1 rounded-md bg-muted/40 shrink-0">{icon}</div>
        </div>
        <CompactValue
          compactValue={compactValue}
          fullValue={fullValue}
          className="text-sm font-bold cursor-help leading-tight"
        />
      </CardContent>
    </Card>
  );
};

const Financial = () => {
  const { t, currency, numberFormat } = useLocalization();
  const { formatMonthYear } = useDateFormat();
  const { financialEntries, isLoading } = useFinancialEntries();
  const { invoices, agingSummary } = useFinancialARWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [editingEntry, setEditingEntry] = useState<typeof financialEntries[0] | undefined>();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("last90");

  const periodStartDate = useMemo(() => getPeriodStartDate(periodFilter), [periodFilter]);
  const periodLabel = useMemo(() => t(`financial:kpi.periods.${periodFilter}`), [periodFilter, t]);

  const filteredEntries = useMemo(() => {
    if (!financialEntries) return [];
    if (!periodStartDate) return financialEntries;

    return financialEntries.filter(entry => {
      const date = new Date(entry.date);
      return date >= periodStartDate;
    });
  }, [financialEntries, periodStartDate]);

  const periodInvoices = useMemo(() => {
    if (!periodStartDate) return invoices;
    return invoices.filter(invoice => new Date(invoice.issue_date) >= periodStartDate);
  }, [invoices, periodStartDate]);

  const collectionRate = useMemo(() => {
    if (periodInvoices.length === 0) return 0;
    const totalIssued = periodInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    if (totalIssued <= 0) return 0;
    const totalPaid = periodInvoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
    return (totalPaid / totalIssued) * 100;
  }, [periodInvoices]);

  const monthlyBurnRate = useMemo(() => {
    const periodDays = periodFilter === "all" ? 365 : PERIOD_DAYS[periodFilter];
    const totalOut = filteredEntries
      .filter(e => e.entry_type === "expense")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return (totalOut / periodDays) * 30;
  }, [filteredEntries, periodFilter]);

  const { totalInflow, totalOutflow, netCashflow, grossMarginPct } = useMemo(() => {
    if (!filteredEntries) {
      return {
        totalInflow: 0,
        totalOutflow: 0,
        netCashflow: 0,
        grossMarginPct: 0,
      };
    }

    const inflow = filteredEntries
      .filter(e => e.entry_type === "income")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const outflow = filteredEntries
      .filter(e => e.entry_type === "expense")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const net = inflow - outflow;
    const margin = inflow > 0 ? (net / inflow) * 100 : 0;

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashflow: net,
      grossMarginPct: margin,
    };
  }, [filteredEntries]);

  const filteredTransactions = useMemo(() => {
    if (!filteredEntries) return [];
    if (!selectedTransactionId) return filteredEntries;
    return filteredEntries.filter(entry => entry.id === selectedTransactionId);
  }, [filteredEntries, selectedTransactionId]);

  const { monthlyData, revenueVsExpenses } = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0) {
      return { monthlyData: [], revenueVsExpenses: [] };
    }

    // Group entries by month
    const monthlyGroups: Record<string, { month: string; Revenue: number; Expenses: number; Profit: number; date: Date }> = {};
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = formatMonthYear(entry.date);
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { month: monthLabel, Revenue: 0, Expenses: 0, Profit: 0, date };
      }
      
      if (entry.entry_type === 'income') {
        monthlyGroups[monthKey].Revenue += Number(entry.amount);
      } else {
        monthlyGroups[monthKey].Expenses += Number(entry.amount);
      }
      monthlyGroups[monthKey].Profit = monthlyGroups[monthKey].Revenue - monthlyGroups[monthKey].Expenses;
    });

    // Sort by date and get last 6 months
    const data = Object.values(monthlyGroups)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6)
      .map(({ month, Revenue, Expenses, Profit }) => ({ month, Revenue, Expenses, Profit }));

    return { monthlyData: data, revenueVsExpenses: data };
  }, [filteredEntries, formatMonthYear]);

  const { upcomingInstallments } = useMemo(() => {
    if (!financialEntries) return { upcomingInstallments: [] };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = financialEntries
      .filter(e => {
        const entryDate = new Date(e.date);
        return entryDate >= today && e.entry_type === 'income';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
      .map(entry => ({
        id: entry.id,
        title: entry.description || t('financial.noDescription'),
        project: entry.projects?.name || t('financial.notAvailable'),
        amount: formatCurrency(Number(entry.amount), currency),
        date: formatDateSystem(entry.date),
      }));

      return { upcomingInstallments: upcoming };
  }, [financialEntries, currency, t]);

  const [installmentsOpen, setInstallmentsOpen] = useState(false);

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("financial:title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("financial:subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-sidebar-primary-foreground/80">
                {t("financial:kpi.periodLabel")}
              </p>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
                <SelectTrigger className="w-[180px] bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-4 !rounded-full font-bold whitespace-nowrap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">{t("financial:kpi.periods.last30")}</SelectItem>
                  <SelectItem value="last90">{t("financial:kpi.periods.last90")}</SelectItem>
                  <SelectItem value="last365">{t("financial:kpi.periods.last365")}</SelectItem>
                  <SelectItem value="all">{t("financial:kpi.periods.all")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="glass-style-white"
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
              variant="glass-style-white"
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
              variant="glass-style-white"
              onClick={() => setInstallmentsOpen(true)}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              {t("financial:installments.title")}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid grid-flow-col auto-cols-[minmax(150px,1fr)] gap-2 overflow-x-auto pb-1">
        <FinancialKpiCard
          title={t("financial:kpi.cashIn")}
          icon={<DollarSign className="h-3.5 w-3.5 text-success" />}
          compactValue={numberFormat === "compact"
            ? formatCompactCurrency(totalInflow, currency)
            : formatCurrency(totalInflow, currency)}
          fullValue={formatCurrency(totalInflow, currency)}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.cashIn") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.cashIn.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.cashIn.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.cashOut")}
          icon={<TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          compactValue={numberFormat === "compact"
            ? formatCompactCurrency(totalOutflow, currency)
            : formatCurrency(totalOutflow, currency)}
          fullValue={formatCurrency(totalOutflow, currency)}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.cashOut") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.cashOut.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.cashOut.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.netCashFlow")}
          icon={<CreditCard className="h-3.5 w-3.5 text-primary" />}
          compactValue={numberFormat === "compact"
            ? formatCompactCurrency(netCashflow, currency)
            : formatCurrency(netCashflow, currency)}
          fullValue={formatCurrency(netCashflow, currency)}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.netCashFlow") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.netCashFlow.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.netCashFlow.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.grossMargin")}
          icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
          compactValue={`${grossMarginPct.toFixed(1)}%`}
          fullValue={`${grossMarginPct.toFixed(2)}%`}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.grossMargin") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.grossMargin.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.grossMargin.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.collectionRate")}
          icon={<TrendingUp className="h-3.5 w-3.5 text-success" />}
          compactValue={`${collectionRate.toFixed(1)}%`}
          fullValue={`${collectionRate.toFixed(2)}%`}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.collectionRate") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.collectionRate.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.collectionRate.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.averageDso")}
          icon={<CalendarClock className="h-3.5 w-3.5 text-warning" />}
          compactValue={`${agingSummary.averageDSO} ${t("financial:kpi.days")}`}
          fullValue={`${agingSummary.averageDSO} ${t("financial:kpi.days")}`}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.averageDso") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.averageDso.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", {
            period: t("financial:kpi.periods.all"),
          })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.averageDso.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.outstandingAr")}
          icon={<DollarSign className="h-3.5 w-3.5 text-orange-500" />}
          compactValue={numberFormat === "compact"
            ? formatCompactCurrency(agingSummary.totalOutstanding, currency)
            : formatCurrency(agingSummary.totalOutstanding, currency)}
          fullValue={formatCurrency(agingSummary.totalOutstanding, currency)}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.outstandingAr") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.outstandingAr.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", {
            period: t("financial:kpi.periods.all"),
          })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.outstandingAr.source"),
          })}
        />
        <FinancialKpiCard
          title={t("financial:kpi.monthlyBurnRate")}
          icon={<TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          compactValue={numberFormat === "compact"
            ? formatCompactCurrency(monthlyBurnRate, currency)
            : formatCurrency(monthlyBurnRate, currency)}
          fullValue={formatCurrency(monthlyBurnRate, currency)}
          tooltipLabel={t("financial:kpi.tooltip.label", { metric: t("financial:kpi.monthlyBurnRate") })}
          tooltipFormula={t("financial:kpi.tooltip.formula", {
            formula: t("financial:kpi.definitions.monthlyBurnRate.formula"),
          })}
          tooltipPeriod={t("financial:kpi.tooltip.period", { period: periodLabel })}
          tooltipSource={t("financial:kpi.tooltip.source", {
            source: t("financial:kpi.definitions.monthlyBurnRate.source"),
          })}
        />
      </div>

      <FinancialAIInsightsPanel />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('financial.monthlyTrends')}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <p className="mb-1">{t('financial.noDataAvailable')}</p>
                  <p className="text-sm">{t('financial.addTransactionsTrends')}</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} name={t('financial.chartLabels.revenue')} />
                  <Line type="monotone" dataKey="Expenses" stroke="hsl(var(--destructive))" strokeWidth={2} name={t('financial.chartLabels.expenses')} />
                  <Line type="monotone" dataKey="Profit" stroke="hsl(var(--success))" strokeWidth={2} name={t('financial.chartLabels.profit')} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('financial.revenueVsExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueVsExpenses.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <p className="mb-1">{t('financial.noDataAvailable')}</p>
                  <p className="text-sm">{t('financial.addTransactionsRevenue')}</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Revenue" fill="hsl(var(--primary))" name={t('financial.chartLabels.revenue')} />
                  <Bar dataKey="Expenses" fill="hsl(var(--destructive))" name={t('financial.chartLabels.expenses')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('financial.recentTransactions')}</CardTitle>
              <Button 
                variant="link"
                onClick={() => window.location.href = '/financial-ledger'}
              >
                {t('financial.viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground text-center">{t('financial.loadingTransactions')}</p>
              ) : filteredEntries && filteredEntries.length > 0 ? (
                filteredEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          entry.entry_type === "income" ? "bg-success/10" : "bg-destructive/10"
                        }`}
                      >
                        {entry.entry_type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{entry.category}</p>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {entry.description && <p>{entry.description}</p>}
                          <p>{entry.projects?.name || t('financial.notAvailable')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            entry.entry_type === "income" ? "text-success" : "text-destructive"
                          }`}
                        >
                          {entry.entry_type === "income" ? '+' : '-'}{formatCurrency(Number(entry.amount), currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDateSystem(entry.date)}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTransactionId(entry.id);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">{t('financial.noTransactionsFound')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('financial.installments.upcoming')}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground text-center">{t('financial.loading')}</p>
              ) : upcomingInstallments.length > 0 ? (
                upcomingInstallments.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CalendarClock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-muted-foreground">{entry.project}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">+{entry.amount}</p>
                      <p className="text-sm text-muted-foreground">{entry.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">{t('financial.installments.noUpcoming')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FinancialEntryForm 
        open={formOpen} 
        onOpenChange={setFormOpen}
        entry={editingEntry}
        defaultType={formType}
      />

      <InstallmentsForm
        open={installmentsOpen}
        onOpenChange={setInstallmentsOpen}
      />

      <TransactionDetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        transactions={filteredTransactions}
        selectedTransaction={filteredEntries?.find(e => e.id === selectedTransactionId)}
      />
      </div>
  );
};

export default Financial;
