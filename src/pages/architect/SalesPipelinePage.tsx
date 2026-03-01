import { useState } from 'react';
import { OpportunitiesKanban } from '@/components/Architect/Opportunities/OpportunitiesKanban';
import { useArchitectOpportunities } from '@/hooks/useArchitectOpportunities';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { Button } from '@/components/ui/button';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { useUserRoles } from '@/hooks/useUserRoles';

export default function SalesPipelinePage() {
  useRouteTranslations(); // Load translations for this route
  const { t } = useLocalization();
  const { isLoading, error, opportunities } = useArchitectOpportunities();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: roles } = useUserRoles();

  // Calculate total pipeline value dynamically
  const totalPipelineValue = opportunities?.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0) || 0;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  // Show message if backend data is not available
  if (error) {
    return (
      <div className="w-full px-6 pt-4 pb-8">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <p className="text-lg font-medium text-center text-destructive/80">
              {t('architect.opportunities.backendNotAvailable')}
            </p>
          </CardContent>
        </Card>
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
              {t('architect.navigation.salesPipeline')}
            </h1>
            <p className="text-white/90 font-medium text-base max-w-2xl">
              {t('architect.opportunities.newDescription')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <Button 
              variant="glass-style-white"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('architect.opportunities.addNew')}
            </Button>
            <div className="flex items-center gap-2 px-4 h-10 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
              <DollarSign className="h-4 w-4 text-emerald-300" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">{t('architect.opportunities.totalValue')}: ${totalPipelineValue >= 1000000 ? `$${(totalPipelineValue / 1000000).toFixed(1)}M` : `$${(totalPipelineValue / 1000).toFixed(0)}k`}</span>
            </div>
          </div>
        </div>
      </SidebarHeaderShell>

      <OpportunitiesKanban externalFormOpen={isFormOpen} onExternalFormOpenChange={setIsFormOpen} />
    </div>
  );
}
