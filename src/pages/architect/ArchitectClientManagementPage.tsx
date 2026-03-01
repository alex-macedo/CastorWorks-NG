/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building2,
  DollarSign,
  TrendingUp,
  UserPlus,
  Target,
  Filter,
} from 'lucide-react';
import { ClientCard } from '@/components/Clients/ClientCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useUserRoles } from '@/hooks/useUserRoles';

// Sales funnel stages
const FUNNEL_STAGES = [
  { id: 'interessado', labelKey: 'architect.clients.funnel.interested', color: 'bg-blue-500' },
  { id: 'conversa', labelKey: 'architect.clients.funnel.conversation', color: 'bg-blue-500' },
  { id: 'proposta_enviada', labelKey: 'architect.clients.funnel.proposalSent', color: 'bg-orange-500' },
  { id: 'negociacao', labelKey: 'architect.clients.funnel.negotiation', color: 'bg-blue-500' },
  { id: 'fechado', labelKey: 'architect.clients.funnel.closed', color: 'bg-teal-500' },
] as const;

type FunnelStage = typeof FUNNEL_STAGES[number]['id'];

export default function ArchitectClientManagementPage() {
  useRouteTranslations(); // Load translations for this route
  const { t, currency, language } = useLocalization();
  const { data: roles } = useUserRoles();
  const navigate = useNavigate();
  const { clients, isLoading } = useClients();
  const { projects } = useProjects();
  const { opportunities } = useSalesPipeline();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Map opportunity status to funnel stages
  const mapStatusToFunnelStage = (status: string): FunnelStage => {
    switch (status) {
      case 'lead':
        return 'interessado';
      case 'qualified':
      case 'contact':
        return 'conversa';
      case 'proposal':
        return 'proposta_enviada';
      case 'negotiation':
        return 'negociacao';
      case 'won':
        return 'fechado';
      default:
        return 'interessado';
    }
  };

  // Enrich clients with additional data and funnel stage
  const enrichedClients = useMemo(() => {
    return clients?.map((client) => {
      // Find client opportunities
      const clientOpportunities =
        opportunities?.filter((opp) => opp.client_id === client.id) || [];

      // Determine funnel stage based on most advanced opportunity
      let funnelStage: FunnelStage = 'interessado';
      let stageIndex = 0;

      clientOpportunities.forEach((opp) => {
        const oppStage = mapStatusToFunnelStage(opp.status);
        const oppIndex = FUNNEL_STAGES.findIndex(s => s.id === oppStage);
        if (oppIndex > stageIndex) {
          stageIndex = oppIndex;
          funnelStage = oppStage;
        }
      });

      // Find client projects
      const clientProjects = projects?.filter((p) => p.client_id === client.id) || [];

      // Calculate total value from opportunities
      const totalValue = clientOpportunities.reduce(
        (sum, opp) => sum + (opp.estimated_value || 0),
        0
      );

      // Calculate accepted proposals value (won opportunities)
      const acceptedValue = clientOpportunities
        .filter((opp) => opp.status === 'won')
        .reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

      return {
        ...client,
        funnelStage,
        opportunityCount: clientOpportunities.length,
        projectCount: clientProjects.length,
        totalValue,
        acceptedValue,
      };
    }) || [];
  }, [clients, projects, opportunities]);

  // Calculate funnel metrics
  const funnelMetrics = useMemo(() => {
    const stageCounts = FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: enrichedClients.filter((c) => c.funnelStage === stage.id).length,
    }));

    const totalClients = enrichedClients.length;
    const activeClients = enrichedClients.filter(
      (c) => c.funnelStage !== 'interessado'
    ).length;

    const totalProposalValue = enrichedClients.reduce((sum, c) => sum + c.totalValue, 0);
    const acceptedProposalValue = enrichedClients.reduce(
      (sum, c) => sum + c.acceptedValue,
      0
    );

    // Calculate dynamic percentages based on total clients
    const stageCountsWithPercentage = stageCounts.map((stage) => ({
      ...stage,
      percentage: totalClients > 0 ? Math.round((stage.count / totalClients) * 100) : 0,
    }));

    // Calculate conversion rate (closed / total * 100)
    const conversionRate = totalClients > 0 
      ? Math.round((stageCounts.find(s => s.id === 'fechado')?.count || 0) / totalClients * 100 * 10) / 10
      : 0;

    return {
      stageCounts: stageCountsWithPercentage,
      totalClients,
      activeClients,
      totalProposalValue,
      acceptedProposalValue,
      conversionRate,
    };
  }, [enrichedClients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return enrichedClients.filter((client) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = client.name?.toLowerCase().includes(query);
        const matchesEmail = client.email?.toLowerCase().includes(query);
        const matchesCompany = client.company_name?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesCompany) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && client.funnelStage !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedClients, searchQuery, statusFilter]);

  const formatCurrency = (value: number) => {
    const localeMap: Record<string, string> = {
      'en-US': 'en-US',
      'pt-BR': 'pt-BR',
      'es-ES': 'es-ES',
      'fr-FR': 'fr-FR',
    };
    const locale = localeMap[language] || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const getStageLabel = (stage: FunnelStage) => {
    const stageConfig = FUNNEL_STAGES.find((s) => s.id === stage);
    return stageConfig ? t(stageConfig.labelKey) : stage;
  };

  const getStageColor = (stage: FunnelStage) => {
    switch (stage) {
      case 'negociacao':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fechado':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'proposta_enviada':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'conversa':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Premium Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('architect.clients.management.title')}
            </h1>
            <p className="text-white/90 font-medium text-base max-w-2xl">
              {t('architect.clients.management.description')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
             <Button variant="glass-style-white" onClick={() => navigate('/clientes/new', { state: { returnTo: '/architect/clients' } })}>
               <Plus className="mr-2 h-4 w-4" />
               {t('architect.clients.new')}
             </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-1">
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group text-right">
          <div className="h-1 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">{t('architect.clients.management.totalClients')}</p>
                <p className="text-3xl font-bold">{funnelMetrics.totalClients}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-inner">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group text-right">
          <div className="h-1 w-full bg-success/20 group-hover:bg-success transition-colors" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">{t('architect.clients.management.activeClients')}</p>
                <p className="text-3xl font-bold">{funnelMetrics.activeClients}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-success shadow-inner">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group text-right">
          <div className="h-1 w-full bg-orange-500/20 group-hover:bg-orange-500 transition-colors" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">{t('architect.clients.management.proposalsSent')}</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(funnelMetrics.totalProposalValue)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shadow-inner">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group text-right">
          <div className="h-1 w-full bg-teal-500/20 group-hover:bg-teal-500 transition-colors" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">{t('architect.clients.management.proposalsAccepted')}</p>
                <p className="text-3xl font-bold text-teal-600">
                  {formatCurrency(funnelMetrics.acceptedProposalValue)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500 shadow-inner">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Client List + Sales Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-1">
        {/* Left: Client List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-card border-none shadow-sm h-11">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('architect.clients.management.funnel')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('architect.clients.management.funnel')}</SelectItem>
                {FUNNEL_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {t(stage.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('architect.clients.management.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-none shadow-sm h-11"
              />
            </div>
          </div>

          {/* Client Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredClients.length === 0 ? (
              <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl bg-transparent md:col-span-2">
                <div className="p-4 rounded-full bg-muted">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1 px-4">
                  <h3 className="font-semibold text-xl">{t('architect.clients.management.noClientsFound')}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">{t('architect.clients.management.noClientsFoundDesc')}</p>
                </div>
              </Card>
            ) : (
              filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  projects={projects}
                  onClick={() => navigate(`/clientes/${client.id}`, { state: { returnTo: '/architect/clients' } })}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Sales Funnel Widget */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm sticky top-24 overflow-hidden rounded-3xl">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">{t('architect.clients.management.salesFunnel')}</CardTitle>
              </div>
              <CardDescription className="font-medium">
                {t('architect.clients.management.funnelDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {funnelMetrics.stageCounts.map((stage, index) => {
                const stageClients = stage.count;
                const isLast = index === funnelMetrics.stageCounts.length - 1;

                return (
                  <div key={stage.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground/80">{getStageLabel(stage.id)}</span>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0">
                        {stageClients}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Progress
                        value={stage.percentage}
                        className="h-8 rounded-lg bg-muted/50"
                      />
                      <div 
                        className={`absolute inset-0 rounded-lg transition-all duration-500 flex items-center justify-center ${stage.color}`}
                        style={{ width: `${stage.percentage}%` }}
                      >
                         <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                          {stage.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 mt-6 border-t border-border/50">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">{t('architect.clients.management.conversionRateLabel')}</span>
                    <span className="font-bold text-success">{funnelMetrics.conversionRate}%</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
