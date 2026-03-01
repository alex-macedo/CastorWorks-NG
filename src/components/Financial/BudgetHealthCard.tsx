import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';

interface BudgetHealthCardProps {
  variant?: 'default' | 'dashboard';
}

export function BudgetHealthCard({ variant = 'default' }: BudgetHealthCardProps) {
  const { t } = useLocalization();
  const { projects = [] } = useProjects();

  const budgetStats = useMemo(() => {
    // For now, use mock data since budget intelligence is not fully integrated
    // In the future, this would aggregate actual budget data from projects
    const totalBudget = 2500000; // Mock total budget across projects
    const totalSpent = 1875000; // Mock total spent
    const utilizationRate = (totalSpent / totalBudget) * 100;

    // Mock health score - in real implementation this would come from budget intelligence
    const healthScore = Math.max(0, Math.min(100, 100 - (utilizationRate - 75) * 1.5));

    return {
      totalBudget,
      totalSpent,
      utilizationRate,
      healthScore,
      projectCount: projects.length,
    };
  }, [projects]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (variant === 'dashboard') {
    return (
      <Link to="/financial-overview" className="block group">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-sm">
                Budget Health
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  {getHealthIcon(budgetStats.healthScore)}
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight">
                  {budgetStats.healthScore.toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Health Score
                </p>
              </div>

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight">
                  {budgetStats.utilizationRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Utilized
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="font-bold text-sm">
            Budget Overview
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">
              ${budgetStats.totalBudget.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Total Budget
            </p>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">
              ${budgetStats.totalSpent.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Total Spent
            </p>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              {getHealthIcon(budgetStats.healthScore)}
            </div>
            <p className={`text-2xl font-bold font-mono tracking-tight ${getHealthColor(budgetStats.healthScore)}`}>
              {budgetStats.healthScore.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Health Score
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BudgetHealthCard;