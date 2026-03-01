import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';

interface PhaseData {
  phase: {
    name: string;
  };
  total_material: number;
  total_labor: number;
  total_direct_cost: number;
  bdi_amount: number;
  final_total: number;
}

interface LineItemData {
  sinapi_code: string;
  description: string;
  total_material: number;
  total_labor: number;
  total_cost: number;
  phase?: {
    name: string;
  };
}

interface BudgetVisualizationProps {
  phaseTotals: PhaseData[];
  lineItems: LineItemData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#14B8A6'];

export const BudgetVisualization = ({ phaseTotals, lineItems }: BudgetVisualizationProps) => {
  const { t } = useLocalization();

  // Prepare data for phase distribution (pie chart)
  const phaseDistributionData = phaseTotals.map((phase) => ({
    name: phase.phase.name,
    value: phase.final_total,
  }));

  // Prepare data for material vs labor by phase (bar chart)
  const materialLaborByPhase = phaseTotals.map((phase) => ({
    name: phase.phase.name,
    [t('budgets.editor.material')]: phase.total_material,
    [t('budgets.editor.labor')]: phase.total_labor,
  }));

  // Prepare data for cost breakdown (stacked bar)
  const costBreakdownByPhase = phaseTotals.map((phase) => ({
    name: phase.phase.name,
    [t('budgets.phases.directCost')]: phase.total_direct_cost,
    [t('budgets.phases.bdiAmount')]: phase.bdi_amount,
  }));

  // Calculate totals for summary cards
  const totalMaterial = phaseTotals.reduce((sum, p) => sum + p.total_material, 0);
  const totalLabor = phaseTotals.reduce((sum, p) => sum + p.total_labor, 0);
  const totalDirect = phaseTotals.reduce((sum, p) => sum + p.total_direct_cost, 0);
  const totalBDI = phaseTotals.reduce((sum, p) => sum + p.bdi_amount, 0);
  const grandTotal = phaseTotals.reduce((sum, p) => sum + p.final_total, 0);

  const materialPercentage = totalDirect > 0 ? (totalMaterial / totalDirect) * 100 : 0;
  const laborPercentage = totalDirect > 0 ? (totalLabor / totalDirect) * 100 : 0;
  const bdiPercentage = totalDirect > 0 ? (totalBDI / totalDirect) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budgets.editor.material')}</CardDescription>
            <CardTitle className="text-2xl">${totalMaterial.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {materialPercentage.toFixed(1)}% {t('budgets.summary.ofDirect')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budgets.editor.labor')}</CardDescription>
            <CardTitle className="text-2xl">${totalLabor.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {laborPercentage.toFixed(1)}% {t('budgets.summary.ofDirect')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budgets.phases.directCost')}</CardDescription>
            <CardTitle className="text-2xl">${totalDirect.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">100% {t('budgets.summary.base')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budgets.phases.bdiAmount')}</CardDescription>
            <CardTitle className="text-2xl">${totalBDI.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {bdiPercentage.toFixed(1)}% {t('budgets.bdi.overhead')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budgets.summary.grandTotal')}</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">${grandTotal.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('budgets.summary.finalCost')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="distribution" variant="pill" className="w-full">
        <TabsList>
          <TabsTrigger value="distribution">{t('budgets.charts.distribution')}</TabsTrigger>
          <TabsTrigger value="materialLabor">{t('budgets.charts.materialVsLabor')}</TabsTrigger>
          <TabsTrigger value="breakdown">{t('budgets.charts.costBreakdown')}</TabsTrigger>
        </TabsList>

        {/* Phase Distribution Pie Chart */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>{t('budgets.charts.phaseDistribution')}</CardTitle>
              <CardDescription>{t('budgets.charts.phaseDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={phaseDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {phaseDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Material vs Labor Bar Chart */}
        <TabsContent value="materialLabor">
          <Card>
            <CardHeader>
              <CardTitle>{t('budgets.charts.materialVsLabor')}</CardTitle>
              <CardDescription>{t('budgets.charts.materialVsLaborDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={materialLaborByPhase}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey={t('budgets.editor.material')} fill="#0088FE" />
                  <Bar dataKey={t('budgets.editor.labor')} fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Breakdown Stacked Bar Chart */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>{t('budgets.charts.costBreakdown')}</CardTitle>
              <CardDescription>{t('budgets.charts.costBreakdownDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={costBreakdownByPhase}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey={t('budgets.phases.directCost')} stackId="a" fill="#0088FE" />
                  <Bar dataKey={t('budgets.phases.bdiAmount')} stackId="a" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

